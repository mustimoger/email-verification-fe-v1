"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";

import { useAuth } from "../components/auth-provider";
import { DashboardShell } from "../components/dashboard-shell";
import {
  apiClient,
  ApiError,
  externalApiClient,
  type LimitsResponse,
  type TaskDetailResponse,
  type TaskEmailJob,
} from "../lib/api-client";
import {
  buildColumnOptions,
  columnLettersToIndex,
  FileColumnError,
  readFileColumnInfo,
  type FileColumnInfo,
} from "../verify/file-columns";
import {
  buildTaskUploadsSummary,
  buildManualExportCsv,
  buildManualResultsFromJobs,
  buildUploadSummary,
  createUploadLinks,
  mapUploadResultsToLinks,
  mapVerifyFallbackResults,
  normalizeEmails,
  resolveApiErrorMessage,
  shouldHydrateManualState,
  type UploadSummary,
  type VerificationResult,
} from "../verify/utils";
import styles from "./verify.module.css";
import {
  ManualVerificationCard,
  ResultsCard,
  UploadSection,
  VerifyHero,
  WorkflowSection,
  type ResultsStatusCounts,
} from "./verify-sections";

const TASK_POLL_ATTEMPTS = 3;
const TASK_POLL_INTERVAL_MS = 2000;
const TASK_JOBS_MAX_PAGE_SIZE = 100;
const MANUAL_STATE_STORAGE_KEY = "verify.manual.state";

type StatusSummary = {
  counts: ResultsStatusCounts;
  unmapped: string[];
  hasPending: boolean;
};

export default function VerifyV2Client() {
  const { session, loading: authLoading } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
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
  const [latestUploadError, setLatestUploadError] = useState<string | null>(null);
  const [latestUploadRefreshing, setLatestUploadRefreshing] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const manualStateHydratedRef = useRef(false);
  const parseRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const transitionClass = isLoaded ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0";
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

  useEffect(() => {
    let active = true;
    const loadLimits = async () => {
      try {
        const data = await apiClient.getLimits();
        if (!active) return;
        setLimits(data);
        setLimitsError(null);
        console.info("verify.limits.loaded", {
          manual_max_emails: data.manual_max_emails,
          upload_max_mb: data.upload_max_mb,
        });
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

  const fetchAllTaskJobs = async (taskId: string, expectedCount?: number): Promise<TaskEmailJob[]> => {
    const resolvedExpected = typeof expectedCount === "number" && expectedCount > 0 ? expectedCount : null;
    const pageSize = Math.min(resolvedExpected ?? TASK_JOBS_MAX_PAGE_SIZE, TASK_JOBS_MAX_PAGE_SIZE);
    const jobs: TaskEmailJob[] = [];
    let offset = 0;
    while (true) {
      const response = await externalApiClient.getTaskJobs(taskId, pageSize, offset);
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

  const fetchTaskDetailWithRetries = async (taskId: string) => {
    for (let attempt = 1; attempt <= TASK_POLL_ATTEMPTS; attempt += 1) {
      try {
        const detail = await externalApiClient.getTaskDetail(taskId);
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

  const handleRemoveFile = (fileName: string) => {
    const nextFiles = files.filter((file) => file.name !== fileName);
    setFiles(nextFiles);
    const nextSummary = nextFiles.length ? buildUploadSummary(nextFiles, createUploadLinks(nextFiles), new Map()) : null;
    setUploadSummary(nextSummary);
    setColumnMapping((prev) => {
      if (nextFiles.length === 0) return {};
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
    setFileColumns((prev) => {
      if (nextFiles.length === 0) return {};
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
    if (nextFiles.length === 0) setFlowStage("idle");
  };

  const handleBrowseFiles = () => {
    fileInputRef.current?.click();
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
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void handleFilesSelected(event.dataTransfer.files);
  };

  const returnToIdle = () => {
    setFlowStage("idle");
  };

  const returnToFileList = () => {
    if (!uploadSummary) return;
    setFlowStage("popup1");
  };

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
      console.info("verify.upload.external_flags", {
        first_row_has_labels: firstRowHasLabels,
        remove_duplicates: removeDuplicates,
      });
      const uploadResults: Awaited<ReturnType<typeof externalApiClient.uploadBatchFile>>[] = [];
      const failedUploads: { fileName: string; error: string }[] = [];
      await Promise.all(
        files.map(async (file) => {
          const columnValue = columnMapping[file.name]?.trim();
          const columnIndex = columnValue ? columnLettersToIndex(columnValue) : null;
          const info = fileColumns[file.name];
          let emailColumn: string | null = null;
          if (columnIndex !== null) {
            if (firstRowHasLabels && info?.headers?.[columnIndex]) {
              const header = info.headers[columnIndex]?.trim();
              emailColumn = header ? header : `${columnIndex + 1}`;
            } else {
              emailColumn = `${columnIndex + 1}`;
            }
          }
          if (!emailColumn) {
            failedUploads.push({ fileName: file.name, error: "Email column selection is invalid." });
            return;
          }
          try {
            const result = await externalApiClient.uploadBatchFile(file, { emailColumn });
            uploadResults.push(result);
          } catch (err: unknown) {
            const message = resolveApiErrorMessage(err, "verify.upload.external");
            console.error("verify.upload.file_failed", { file_name: file.name, error: message });
            failedUploads.push({ fileName: file.name, error: message });
          }
        }),
      );
      if (failedUploads.length > 0 && uploadResults.length === 0) {
        setFileError("Unable to upload files. Please try again.");
        return;
      }
      if (failedUploads.length > 0) {
        setFileError("Some files failed to upload. Check History for updates.");
      }
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
      const taskResponse = await externalApiClient.listTasks(10, 0, true);
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
      const task = await externalApiClient.createTask(parsed);
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

  const handleClearInput = () => {
    setInputValue("");
    setManualEmails([]);
    setManualTaskId(null);
    setResults([]);
    setErrors(null);
    setExportError(null);
    setToast("Manual verification input cleared.");
    try {
      localStorage.removeItem(MANUAL_STATE_STORAGE_KEY);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : resolveApiErrorMessage(err, "verify.manual.clear");
      console.warn("verify.manual.clear_failed", { error: message });
    }
  };

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

  const statusSummary = useMemo<StatusSummary>(() => {
    const counts: ResultsStatusCounts = {
      valid: 0,
      invalid: 0,
      catchAll: 0,
      unknown: 0,
      pending: 0,
    };
    const unmapped = new Set<string>();
    results.forEach((result) => {
      const status = (result.status ?? "").toLowerCase().trim();
      if (!status) {
        counts.unknown += 1;
        return;
      }
      if (status === "exists" || status === "valid") {
        counts.valid += 1;
        return;
      }
      if (status === "not_exists" || status === "invalid" || status === "invalid_syntax") {
        counts.invalid += 1;
        return;
      }
      if (status === "catchall" || status === "catch-all" || status === "catch_all") {
        counts.catchAll += 1;
        return;
      }
      if (status === "unknown") {
        counts.unknown += 1;
        return;
      }
      if (status === "pending") {
        counts.pending += 1;
        return;
      }
      counts.unknown += 1;
      unmapped.add(status);
    });
    return {
      counts,
      unmapped: Array.from(unmapped),
      hasPending: counts.pending > 0,
    };
  }, [results]);

  useEffect(() => {
    if (statusSummary.unmapped.length > 0) {
      console.warn("verify.manual.status_unmapped", { statuses: statusSummary.unmapped });
    }
  }, [statusSummary.unmapped]);

  const hasResults = results.length > 0;
  const exportDisabled = results.length === 0 || exporting;
  const exportLabel = exporting ? "Downloading..." : "Export results";
  const statusLabel = !hasResults ? "Waiting" : statusSummary.hasPending ? "In progress" : "Completed";

  const showSummaryState = flowStage === "summary" && uploadSummary;

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

  return (
    <DashboardShell>
      <section className={`${styles.root} flex flex-col gap-8`}>
        <VerifyHero transitionClass={transitionClass} />
        <div
          className={`grid gap-6 lg:grid-cols-[1.3fr_1fr] ${transitionClass}`}
          style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.05s" }}
        >
          <ManualVerificationCard
            transitionClass={transitionClass}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onVerify={() => void handleVerify()}
            onClear={handleClearInput}
            isSubmitting={isSubmitting}
            errorMessage={errors}
          />
          <ResultsCard
            transitionClass={transitionClass}
            results={results}
            statusCounts={statusSummary.counts}
            statusLabel={statusLabel}
            onRefresh={manualTaskId ? () => void refreshManualResults() : null}
            isRefreshing={manualRefreshing}
            onExport={() => void handleExportDownload()}
            exportLabel={exportLabel}
            exportDisabled={exportDisabled}
            exportError={exportError}
          />
        </div>
        <UploadSection
          transitionClass={transitionClass}
          flowStage={flowStage}
          uploadSummary={uploadSummary}
          fileInputRef={fileInputRef}
          fileError={fileError}
          fileNotice={fileNotice}
          fileColumns={fileColumns}
          columnMapping={columnMapping}
          firstRowHasLabels={firstRowHasLabels}
          removeDuplicates={removeDuplicates}
          isSubmitting={isSubmitting}
          latestUploadError={latestUploadError}
          latestUploadRefreshing={latestUploadRefreshing}
          summaryBars={summaryBars}
          summaryStatusClass={summaryStatusClass}
          summaryStatusLabel={summaryStatusLabel}
          showSummary={Boolean(showSummaryState)}
          onBrowseFiles={handleBrowseFiles}
          onFilesSelected={(fileList) => void handleFilesSelected(fileList)}
          onDrop={handleDrop}
          onProceedToMapping={proceedToMapping}
          onProceedToSummary={() => void proceedToSummary()}
          onReturnToIdle={returnToIdle}
          onReturnToFileList={returnToFileList}
          onRemoveFile={handleRemoveFile}
          onUpdateColumnMapping={(fileName, value) =>
            setColumnMapping((prev) => ({ ...prev, [fileName]: value }))
          }
          onToggleFirstRow={setFirstRowHasLabels}
          onRefreshSummary={() => void refreshLatestUploads()}
        />
        <WorkflowSection transitionClass={transitionClass} />
      </section>
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
    </DashboardShell>
  );
}
