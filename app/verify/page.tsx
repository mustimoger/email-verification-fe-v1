"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { AlertCircle, Info, UploadCloud, X } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer } from "recharts";

import { useAuth } from "../components/auth-provider";
import { DashboardShell } from "../components/dashboard-shell";
import {
  apiClient,
  ApiError,
  type LimitsResponse,
  type TaskDetailResponse,
  type TaskEmailJob,
} from "../lib/api-client";
import { buildColumnOptions, FileColumnError, readFileColumnInfo, type FileColumnInfo } from "./file-columns";
import {
  buildTaskUploadsSummary,
  buildManualExportCsv,
  buildUploadSummary,
  buildManualResultsFromJobs,
  createUploadLinks,
  formatNumber,
  mapUploadResultsToLinks,
  mapVerifyFallbackResults,
  normalizeEmails,
  resolveApiErrorMessage,
  shouldHydrateManualState,
  type UploadSummary,
  type VerificationResult,
} from "./utils";

const TASK_POLL_ATTEMPTS = 3;
const TASK_POLL_INTERVAL_MS = 2000;
const TASK_JOBS_MAX_PAGE_SIZE = 100;
const MANUAL_STATE_STORAGE_KEY = "verify.manual.state";

export default function VerifyPage() {
  const { session, loading: authLoading } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [manualTaskId, setManualTaskId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const [limits, setLimits] = useState<LimitsResponse | null>(null);
  const [limitsError, setLimitsError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileColumns, setFileColumns] = useState<Record<string, FileColumnInfo>>({});
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [flowStage, setFlowStage] = useState<"idle" | "popup1" | "popup2" | "summary">("idle");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [firstRowHasLabels, setFirstRowHasLabels] = useState<boolean>(true);
  const [removeDuplicates] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [latestUploadError, setLatestUploadError] = useState<string | null>(null);
  const [latestUploadRefreshing, setLatestUploadRefreshing] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const parseRef = useRef(0);
  const latestUploadHydratedRef = useRef(false);
  const manualStateHydratedRef = useRef(false);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const persistManualState = (taskId: string, emails: string[]) => {
    try {
      localStorage.setItem(MANUAL_STATE_STORAGE_KEY, JSON.stringify({ taskId, emails }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : resolveApiErrorMessage(err, "verify.manual.persist");
      console.warn("verify.manual.persist_failed", { error: message });
    }
  };

  const loadManualState = () => {
    try {
      const raw = localStorage.getItem(MANUAL_STATE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { taskId?: unknown; emails?: unknown };
      const taskId = typeof parsed.taskId === "string" ? parsed.taskId.trim() : "";
      const emails = Array.isArray(parsed.emails)
        ? parsed.emails.filter((email): email is string => typeof email === "string" && email.trim().length > 0)
        : [];
      if (!taskId) return null;
      return { taskId, emails };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : resolveApiErrorMessage(err, "verify.manual.load");
      console.warn("verify.manual.load_failed", { error: message });
      return null;
    }
  };

  useEffect(() => {
    let active = true;
    const loadLimits = async () => {
      try {
        const data = await apiClient.getLimits();
        if (!active) return;
        setLimits(data);
        setLimitsError(null);
        console.info("verify.limits.loaded", { manual_max_emails: data.manual_max_emails, upload_max_mb: data.upload_max_mb });
      } catch (err: unknown) {
        if (!active) return;
        const message = err instanceof ApiError ? err.details || err.message : "Unable to load limits";
        console.error("verify.limits.load_failed", { error: message });
        setLimitsError("Unable to load verification limits. Please refresh.");
      }
    };
    loadLimits();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!uploadSummary) return;
    if (latestUploadHydratedRef.current) return;
    latestUploadHydratedRef.current = true;
  }, [uploadSummary]);

  useEffect(() => {
    let active = true;
    const hydrateManualState = async () => {
      if (
        !shouldHydrateManualState({
          authLoading,
          hasSession: Boolean(session),
          manualTaskId,
          resultsCount: results.length,
          manualEmailsCount: manualEmails.length,
          inputValue,
          alreadyHydrated: manualStateHydratedRef.current,
        })
      ) {
        return;
      }
      const stored = loadManualState();
      if (!stored) {
        manualStateHydratedRef.current = true;
        return;
      }
      if (!active) return;
      const { taskId, emails } = stored;
      setManualTaskId(taskId);
      if (emails.length > 0) {
        applyManualEmails(emails);
      }
      setResults(mapVerifyFallbackResults(emails, taskId));
      setErrors(null);
      setExportError(null);
      try {
        await refreshManualResults(taskId, emails, { silent: true });
      } finally {
        manualStateHydratedRef.current = true;
      }
    };
    void hydrateManualState();
    return () => {
      active = false;
    };
  }, [authLoading, inputValue, manualEmails.length, manualTaskId, results.length, session]);

  const applyManualEmails = (emails: string[]) => {
    if (!emails.length) return;
    setManualEmails(emails);
    setInputValue((prev) => (prev.trim().length > 0 ? prev : emails.join("\n")));
  };

  const applyManualJobs = (emails: string[] | null | undefined, jobs: TaskEmailJob[]) => {
    const resolvedEmails = emails ?? [];
    if (resolvedEmails.length > 0) {
      applyManualEmails(resolvedEmails);
    }
    setResults(buildManualResultsFromJobs(resolvedEmails, jobs));
    setErrors(null);
    setExportError(null);
  };

  const fetchAllTaskJobs = async (taskId: string, expectedCount?: number): Promise<TaskEmailJob[]> => {
    const resolvedExpected = typeof expectedCount === "number" && expectedCount > 0 ? expectedCount : null;
    const pageSize = Math.min(resolvedExpected ?? TASK_JOBS_MAX_PAGE_SIZE, TASK_JOBS_MAX_PAGE_SIZE);
    const jobs: TaskEmailJob[] = [];
    let offset = 0;
    while (true) {
      const response = await apiClient.getTaskJobs(taskId, pageSize, offset);
      const pageJobs = response.jobs ?? [];
      jobs.push(...pageJobs);
      if (resolvedExpected !== null && jobs.length >= resolvedExpected) {
        break;
      }
      if (pageJobs.length < pageSize) {
        break;
      }
      offset += pageSize;
    }
    return jobs;
  };

  const fetchTaskJobsWithRetries = async (
    taskId: string,
    expectedCount?: number,
  ): Promise<TaskEmailJob[]> => {
    for (let attempt = 1; attempt <= TASK_POLL_ATTEMPTS; attempt += 1) {
      try {
        const jobs = await fetchAllTaskJobs(taskId, expectedCount);
        if (jobs.length > 0 || expectedCount === 0) {
          return jobs;
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 402) {
          const message = resolveApiErrorMessage(err, "verify.manual.jobs");
          console.warn("verify.manual.jobs_insufficient_credits", { taskId, attempt, error: message });
          throw err;
        }
        const message = resolveApiErrorMessage(err, "verify.manual.jobs");
        console.error("verify.manual.jobs_failed", { taskId, attempt, error: message });
      }
      if (attempt < TASK_POLL_ATTEMPTS) {
        await wait(TASK_POLL_INTERVAL_MS);
      }
    }
    return [];
  };

  const refreshManualResults = async (
    taskIdOverride?: string | null,
    emailsOverride?: string[] | null,
    options?: { silent?: boolean },
  ) => {
    setExportError(null);
    if (!options?.silent) {
      setManualRefreshing(true);
    }
    try {
      const taskId = taskIdOverride ?? manualTaskId;
      if (!taskId) {
        setErrors("No manual verification task found.");
        return;
      }
      const emails = emailsOverride ?? manualEmails;
      const jobs = await fetchTaskJobsWithRetries(taskId, emails.length || undefined);
      if (jobs.length === 0) {
        setErrors("No verification results available yet.");
        return;
      }
      setManualTaskId(taskId);
      applyManualJobs(emails, jobs);
      if (emails.length > 0) {
        persistManualState(taskId, emails);
      }
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, "verify.manual.refresh");
      console.error("verify.manual.refresh_failed", { error: message });
      setErrors(message);
    } finally {
      if (!options?.silent) {
        setManualRefreshing(false);
      }
    }
  };

  const resolveExportResults = async (): Promise<VerificationResult[]> => {
    if (!manualTaskId || results.length === 0) {
      throw new Error("No manual verification results to export.");
    }
    try {
      const jobs = await fetchAllTaskJobs(manualTaskId, manualEmails.length || undefined);
      if (jobs.length === 0) {
        console.warn("verify.manual.export_missing_results", { task_id: manualTaskId });
        return results;
      }
      return buildManualResultsFromJobs(manualEmails, jobs);
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, "verify.manual.export_latest");
      console.error("verify.manual.export_latest_failed", { error: message });
      return results;
    }
  };

  const handleExportDownload = async () => {
    if (exporting) return;
    setExportError(null);
    setExporting(true);
    try {
      const exportResults = await resolveExportResults();
      if (exportResults.length === 0) {
        setExportError("No results available to export.");
        return;
      }
      const csv = buildManualExportCsv(exportResults);
      if (!csv) {
        setExportError("Export is empty.");
        return;
      }
      if (!manualTaskId) {
        setExportError("Export is unavailable without a task id.");
        return;
      }
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${manualTaskId}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setToast("Download started.");
      console.info("verify.manual.export_success", {
        count: exportResults.length,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : resolveApiErrorMessage(err, "verify.manual.export");
      console.error("verify.manual.export_failed", { error: message });
      setExportError(message);
    } finally {
      setExporting(false);
    }
  };

  const fetchTaskDetailWithRetries = async (taskId: string) => {
    for (let attempt = 1; attempt <= TASK_POLL_ATTEMPTS; attempt += 1) {
      try {
        const detail = await apiClient.getTask(taskId);
        return detail;
      } catch (err: unknown) {
        if (err instanceof ApiError && err.status === 402) {
          const message = resolveApiErrorMessage(err, "verify.task_detail_fetch");
          console.warn("verify.task_detail_insufficient_credits", { taskId, attempt, error: message });
          throw err;
        }
        const message = resolveApiErrorMessage(err, "verify.task_detail_fetch");
        console.error("verify.task_detail_fetch_failed", { taskId, attempt, error: message });
      }
      if (attempt < TASK_POLL_ATTEMPTS) {
        await wait(TASK_POLL_INTERVAL_MS);
      }
    }
    return null;
  };

  const handleVerify = async () => {
    const parsed = normalizeEmails(inputValue);
    if (parsed.length === 0) {
      setErrors("Add at least one email to verify.");
      setResults([]);
      return;
    }
    setExportError(null);
    if (!limits) {
      setErrors(limitsError ?? "Unable to load verification limits. Please refresh.");
      setResults([]);
      return;
    }
    const manualLimit = Number(limits.manual_max_emails);
    if (!Number.isFinite(manualLimit) || manualLimit <= 0) {
      setErrors("Verification limits are unavailable. Please refresh.");
      setResults([]);
      return;
    }
    if (parsed.length > manualLimit) {
      console.warn("verify.manual_limit_exceeded", { count: parsed.length, limit: manualLimit });
      setErrors(`You can verify up to ${manualLimit} emails at once.`);
      setResults([]);
      return;
    }
    setErrors(null);
    setIsSubmitting(true);
    try {
      const task = await apiClient.createTask(parsed);
      const taskId = task.id?.trim();
      if (!taskId) {
        console.error("verify.manual.task_missing_id", { response: task });
        setErrors("Unable to start verification. Please try again.");
        return;
      }
      setManualTaskId(taskId);
      setManualEmails(parsed);
      setResults(mapVerifyFallbackResults(parsed, taskId));
      persistManualState(taskId, parsed);
      const jobs = await fetchTaskJobsWithRetries(taskId, parsed.length || undefined);
      if (jobs.length > 0) {
        applyManualJobs(parsed, jobs);
      } else {
        setErrors("Verification is queued. Refresh to check for updates.");
      }
      setToast(`Submitted ${parsed.length} email${parsed.length === 1 ? "" : "s"} for verification`);
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, "verify.manual.submit");
      setErrors(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    setFileNotice(null);
    if (!fileList || fileList.length === 0) {
      setFileError("No files selected.");
      return;
    }
    if (!limits) {
      setFileError(limitsError ?? "Unable to load upload limits. Please refresh.");
      return;
    }
    const maxMb = Number(limits.upload_max_mb);
    if (!Number.isFinite(maxMb) || maxMb <= 0) {
      setFileError("Upload limits are unavailable. Please refresh.");
      return;
    }
    const incoming = Array.from(fileList);
    const fileNames = incoming.map((file) => file.name);
    if (new Set(fileNames).size !== fileNames.length) {
      setFileError("Duplicate file names detected. Please rename files before uploading.");
      return;
    }
    const maxBytes = maxMb * 1024 * 1024;
    const tooLarge = incoming.find((file) => file.size > maxBytes);
    if (tooLarge) {
      setFileError(`${tooLarge.name} exceeds the ${maxMb} MB limit.`);
      return;
    }
    const parseId = parseRef.current + 1;
    parseRef.current = parseId;
    setFileError(null);
    try {
      const results = await Promise.all(incoming.map((file) => readFileColumnInfo(file)));
      if (parseRef.current !== parseId) return;
      const nextColumns = results.reduce<Record<string, FileColumnInfo>>((acc, info) => {
        acc[info.fileName] = info;
        return acc;
      }, {});
      setFileColumns(nextColumns);
      setFiles(incoming);
      const initialLinks = createUploadLinks(incoming);
      const summary = buildUploadSummary(incoming, initialLinks, new Map());
      setUploadSummary(summary);
      setFlowStage("popup1");
      setColumnMapping(Object.fromEntries(summary.files.map((file) => [file.fileName, ""])));
      console.info("verify.file_columns.loaded", {
        files: results.map((info) => ({ name: info.fileName, columns: info.columnCount })),
      });
      console.info("[verify/upload] files selected", {
        count: incoming.length,
        names: incoming.map((f) => f.name),
        totalEmails: summary.totalEmails,
      });
    } catch (err: unknown) {
      if (parseRef.current !== parseId) return;
      const message =
        err instanceof FileColumnError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to read file columns.";
      console.error("verify.file_columns.failed", {
        error: message,
        details: err instanceof FileColumnError ? err.details : undefined,
      });
      setFileError(message);
      setFileNotice(null);
      setFiles([]);
      setFileColumns({});
      setUploadSummary(null);
      setFlowStage("idle");
      setColumnMapping({});
      return;
    }

  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void handleFilesSelected(event.dataTransfer.files);
  };

  const showSummaryState = flowStage === "summary" && uploadSummary;
  const hasSecondaryContent = flowStage === "popup1" || flowStage === "popup2" || showSummaryState;
  const exportDisabled = results.length === 0 || exporting;
  const exportLabel = exporting ? "Downloading..." : "Download CSV";

  const summaryStatus = useMemo(() => {
    if (!uploadSummary || uploadSummary.files.length === 0) return null;
    const allComplete = uploadSummary.files.every((file) => file.status === "download");
    return allComplete ? "completed" : "processing";
  }, [uploadSummary]);
  const summaryStatusLabel = summaryStatus === "completed" ? "Completed" : "Processing";
  const summaryStatusClass =
    summaryStatus === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";

  const summaryBars = useMemo(() => {
    const values = {
      valid: uploadSummary?.aggregates.valid ?? null,
      invalid: uploadSummary?.aggregates.invalid ?? null,
      catchAll: uploadSummary?.aggregates.catchAll ?? null,
      disposable: null,
    };
    const bars = [
      { key: "valid", label: "Valid", value: values.valid, color: "var(--chart-valid)" },
      { key: "invalid", label: "Invalid", value: values.invalid, color: "var(--chart-invalid)" },
      { key: "catchAll", label: "Catch-all", value: values.catchAll, color: "var(--chart-catchall)" },
      { key: "disposable", label: "Disposable", value: values.disposable, color: "var(--chart-processing)" },
    ];
    return bars.map((bar) => ({
      ...bar,
      numericValue: typeof bar.value === "number" ? bar.value : 0,
    }));
  }, [uploadSummary]);

  useEffect(() => {
    if (!uploadSummary) return;
    const missing = {
      valid: uploadSummary.aggregates.valid === null,
      invalid: uploadSummary.aggregates.invalid === null,
      catchAll: uploadSummary.aggregates.catchAll === null,
    };
    if (Object.values(missing).some(Boolean)) {
      console.info("verify.upload.summary_counts_unavailable", {
        missing,
        task_ids: uploadSummary.files.map((file) => file.taskId).filter(Boolean),
      });
    }
  }, [uploadSummary]);

  const proceedToMapping = () => {
    if (!uploadSummary) return;
    setFlowStage("popup2");
  };

  const proceedToSummary = async () => {
    if (!uploadSummary) return;
    setIsSubmitting(true);
    setFileNotice(null);
    try {
      if (files.length === 0) {
        setFileError("No file to upload.");
        return;
      }
      const missingColumns = files.filter((file) => !columnMapping[file.name]);
      if (missingColumns.length > 0) {
        setFileError("Select the email column for every file before proceeding.");
        return;
      }
      const invalidColumns = files.filter((file) => {
        const mapping = columnMapping[file.name];
        const info = fileColumns[file.name];
        if (!mapping || !info) return true;
        return !buildColumnOptions(info, firstRowHasLabels).some((option) => option.value === mapping);
      });
      if (invalidColumns.length > 0) {
        setFileError("Email column selections are invalid. Please reselect and try again.");
        return;
      }
      setFileError(null);
      const startedAt = new Date().toISOString();
      const metadata = files.map((file) => ({
        file_name: file.name,
        email_column: columnMapping[file.name],
        first_row_has_labels: firstRowHasLabels,
        remove_duplicates: removeDuplicates,
      }));
      const uploadResults = await apiClient.uploadTaskFiles(files, metadata);
      const { links, unmatched, orphaned } = mapUploadResultsToLinks(files, uploadResults);
      const detailsByTaskId = new Map<string, TaskDetailResponse>();
      await Promise.all(
        links.map(async (link) => {
          if (!link.taskId) return;
          try {
            const detail = await fetchTaskDetailWithRetries(link.taskId);
            if (detail) {
              detailsByTaskId.set(link.taskId, detail);
            }
          } catch (err: unknown) {
            const message = resolveApiErrorMessage(err, "verify.upload.detail");
            if (err instanceof ApiError && err.status === 402) {
              setFileError(message);
              return;
            }
            console.error("verify.upload.detail_failed", { task_id: link.taskId, error: message });
          }
        }),
      );
      const summary = buildUploadSummary(files, links, detailsByTaskId, startedAt);
      setFiles([]);
      setFileColumns({});
      setUploadSummary(summary);
      setFlowStage("summary");
      setColumnMapping({});
      setLatestUploadError(null);
      setToast("Upload submitted");
      setFileNotice(null);
      const pendingFiles = summary.files.filter((file) => file.taskId && file.status === "pending");
      if (unmatched > 0) {
        setFileError("Some uploads did not return a task id. Check History for updates.");
      } else if (pendingFiles.length > 0) {
        setFileNotice("Upload submitted. Processing is underway; check Overview or History for updates.");
      }
      if (unmatched > 0 || orphaned.length > 0) {
        console.warn("verify.upload_mapping_incomplete", {
          unmatched,
          orphaned_count: orphaned.length,
          orphaned_filenames: orphaned.map((entry) => entry.filename ?? "unknown"),
        });
      }
      console.info("[verify/upload] uploaded", {
        upload_ids: uploadResults.map((r) => r.upload_id),
        files: files.map((f) => f.name),
        task_ids: links.map((link) => link.taskId).filter(Boolean),
        unmatched,
      });
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, "verify.upload.submit");
      setFileError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshLatestUploads = async () => {
    if (!uploadSummary) return;
    setLatestUploadError(null);
    setLatestUploadRefreshing(true);
    try {
      const taskResponse = await apiClient.listTasks();
      const tasks = taskResponse.tasks ?? [];
      if (tasks.length === 0) {
        setLatestUploadError("No recent uploads found. Upload a file to get started.");
        return;
      }
      const summary = buildTaskUploadsSummary(tasks);
      setUploadSummary(summary);
      setFlowStage("summary");
      console.info("verify.latest_tasks.refreshed", {
        count: tasks.length,
        latest_task_id: tasks[0]?.id,
      });
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, "verify.latest_tasks.refresh");
      console.error("verify.latest_tasks.refresh_failed", { error: message });
      setLatestUploadError(message);
    } finally {
      setLatestUploadRefreshing(false);
    }
  };

  return (
    <DashboardShell>
      <section className="flex flex-col gap-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
            <h2 className="text-lg font-extrabold text-slate-900">Add Emails To Verify</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Enter emails comma separated or on their own line
            </p>
            <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Manual verification results are only available immediately after completion. Download them right away; they
              won't be available later.
            </p>
            <div className="mt-4">
              <textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                rows={8}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 shadow-inner outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
                placeholder={"email1@domain1.com\nemail2@domain2.com"}
              />
            </div>
            {errors ? (
              <div
                className="mt-2 flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="h-4 w-4" />
                {errors}
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleVerify}
              disabled={isSubmitting}
              className="mt-4 w-full rounded-lg bg-[var(--cta)] px-4 py-3 text-center text-sm font-bold uppercase text-[var(--cta-foreground)] shadow-sm transition hover:bg-[var(--cta-hover)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {isSubmitting ? "Verifying..." : "Verify"}
            </button>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-slate-900">Results</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleExportDownload()}
                  disabled={exportDisabled}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {exportLabel}
                </button>
                {manualTaskId ? (
                  <button
                    type="button"
                    onClick={() => void refreshManualResults()}
                    disabled={manualRefreshing}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    {manualRefreshing ? "Refreshing..." : "Refresh status"}
                  </button>
                ) : null}
              </div>
            </div>
            {exportError ? (
              <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" role="alert">
                {exportError}
              </div>
            ) : null}
            <div className="mt-4 h-[360px] rounded-xl border border-slate-200 bg-slate-50 p-4">
              {results.length === 0 ? (
                <p className="text-sm font-semibold text-slate-500">
                  Results will appear here after verification.
                </p>
              ) : (
                <div className="h-full space-y-2 overflow-y-auto pr-2">
                  {results.map((item) => (
                    <div
                      key={item.email}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
                    >
                      <span>{item.email}</span>
                      <span className="text-xs font-bold uppercase text-[var(--accent)]">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div
            className={`rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100 ${
              hasSecondaryContent ? "" : "lg:col-span-3"
            }`}
          >
            <h2 className="text-lg font-extrabold text-slate-900">Upload a file</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              CSV or Excel file
            </p>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="mt-4 flex h-44 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-center"
            >
              <UploadCloud className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">Drop your files here</p>
              <p className="text-xs font-semibold text-slate-500">CSV or Excel file</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">or</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-[var(--accent)] shadow-sm transition hover:border-[var(--accent)]"
                >
                  Browse files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  multiple
                  className="hidden"
                  onChange={(event) => void handleFilesSelected(event.target.files)}
                />
              </div>
            </div>
            {fileError ? (
              <div
                className="mt-2 flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="h-4 w-4" />
                {fileError}
              </div>
            ) : null}
            {fileNotice && !fileError ? (
              <div
                className="mt-2 flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700"
                role="status"
                aria-live="polite"
              >
                <Info className="h-4 w-4" />
                {fileNotice}
              </div>
            ) : null}
          </div>

          {hasSecondaryContent ? (
            <div className="lg:col-span-2 space-y-4">
              {flowStage === "popup1" && uploadSummary ? (
                <div className="space-y-3 rounded-xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-slate-900">Verify Emails</h3>
                    <span className="text-sm font-semibold text-slate-600">
                      {formatNumber(uploadSummary.totalEmails)} emails detected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uploadSummary.files.map((file) => (
                    <span
                      key={file.fileName}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {file.fileName}
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-700"
                          onClick={() => {
                            const nextFiles = files.filter((f) => f.name !== file.fileName);
                            setFiles(nextFiles);
                            const nextSummary = nextFiles.length
                              ? buildUploadSummary(nextFiles, createUploadLinks(nextFiles), new Map())
                              : null;
                            setUploadSummary(nextSummary);
                            setColumnMapping((prev) => {
                              if (nextFiles.length === 0) return {};
                              const next = { ...prev };
                              delete next[file.fileName];
                              return next;
                            });
                            setFileColumns((prev) => {
                              if (nextFiles.length === 0) return {};
                              const next = { ...prev };
                              delete next[file.fileName];
                              return next;
                            });
                            if (nextFiles.length === 0) setFlowStage("idle");
                          }}
                          aria-label={`Remove ${file.fileName}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setFlowStage("idle")}
                      className="text-sm font-semibold text-[var(--accent)] underline"
                    >
                      Go back
                    </button>
                    <button
                      type="button"
                      onClick={proceedToMapping}
                      disabled={isSubmitting}
                      className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      VERIFY EMAILS
                    </button>
                  </div>
                </div>
              ) : null}

              {flowStage === "popup2" && uploadSummary ? (
                <div className="space-y-3 rounded-xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-slate-900">Assign Email Column</h3>
                    <span className="text-sm font-semibold text-slate-600">
                      {formatNumber(uploadSummary.totalEmails)} emails detected
                    </span>
                  </div>
                  <div className="space-y-2">
                    {uploadSummary.files.map((file) => (
                      <div key={file.fileName} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                        <span className="text-sm font-semibold text-slate-700">{file.fileName}</span>
                        <select
                          value={columnMapping[file.fileName] ?? ""}
                          onChange={(event) =>
                            setColumnMapping((prev) => ({ ...prev, [file.fileName]: event.target.value }))
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
                        >
                          <option value="">Select email column</option>
                          {(fileColumns[file.fileName]
                            ? buildColumnOptions(fileColumns[file.fileName], firstRowHasLabels)
                            : []
                          ).map((option) => (
                            <option key={`${file.fileName}-${option.value}`} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={firstRowHasLabels}
                        onChange={(event) => setFirstRowHasLabels(event.target.checked)}
                      />
                      First row has column names
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={removeDuplicates}
                        disabled
                        aria-disabled="true"
                        className="cursor-not-allowed opacity-70"
                      />
                      Remove duplicate emails
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setFlowStage("popup1")}
                      className="text-sm font-semibold text-[var(--accent)] underline"
                    >
                      Go back
                    </button>
                    <button
                      type="button"
                      onClick={proceedToSummary}
                      disabled={isSubmitting}
                      className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      {isSubmitting ? "Submitting..." : "PROCEED"}
                    </button>
                  </div>
                </div>
              ) : null}

              {showSummaryState ? (
                <div className="space-y-3 rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Verification Summary</h3>
                      <p className="text-sm font-semibold text-slate-600">{uploadSummary.uploadDate}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void refreshLatestUploads()}
                      disabled={latestUploadRefreshing}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      {latestUploadRefreshing ? "Refreshing..." : "Refresh status"}
                    </button>
                  </div>
                  {latestUploadError ? (
                    <div className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" role="alert">
                      {latestUploadError}
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {summaryBars.map((bar) => (
                        <div key={bar.key} className="flex flex-col items-center gap-2">
                          <div className="h-40 w-full rounded-full bg-slate-100 px-1 py-1">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[{ value: bar.numericValue }]}
                                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                              >
                                <Bar dataKey="value" fill={bar.color} radius={[999, 999, 999, 999]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <span className="text-xs font-bold text-slate-600">{bar.label}</span>
                          <span className="text-xs font-semibold text-slate-500">{formatNumber(bar.value)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${summaryStatusClass}`}>
                        {summaryStatusLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {toast ? (
          <div className="fixed bottom-6 right-6 z-10 rounded-lg bg-[var(--overlay-strong)] px-4 py-3 text-sm font-semibold text-[var(--text-inverse)] shadow-lg ring-1 ring-[var(--border-strong)]">
            {toast}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-xs font-bold text-[var(--text-inverse)] opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </section>
    </DashboardShell>
  );
}
