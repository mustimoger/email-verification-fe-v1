"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { AlertCircle, Info, UploadCloud, X } from "lucide-react";
import { Cell, Pie, PieChart as RePieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useAuth } from "../components/auth-provider";
import { DashboardShell } from "../components/dashboard-shell";
import {
  apiClient,
  ApiError,
  type LatestManualResponse,
  type LimitsResponse,
  type TaskDetailResponse,
} from "../lib/api-client";
import { clearVerifyRequestId, getVerifyRequestId } from "../lib/verify-idempotency";
import { buildColumnOptions, FileColumnError, readFileColumnInfo, type FileColumnInfo } from "./file-columns";
import {
  buildLatestUploadsSummary,
  buildManualExportCsv,
  buildUploadSummary,
  buildManualResultsFromStored,
  createUploadLinks,
  formatNumber,
  mapUploadResultsToLinks,
  mapVerifyFallbackResults,
  normalizeEmails,
  resolveApiErrorMessage,
  type UploadSummary,
  type VerificationResult,
} from "./utils";

const TASK_POLL_ATTEMPTS = 3;
const TASK_POLL_INTERVAL_MS = 2000;

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
  const [activeDownload, setActiveDownload] = useState<string | null>(null);
  const [latestUploadError, setLatestUploadError] = useState<string | null>(null);
  const [latestUploadRefreshing, setLatestUploadRefreshing] = useState(false);
  const [latestUploadLabel, setLatestUploadLabel] = useState<string | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportAction, setExportAction] = useState<"copy" | "download" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const parseRef = useRef(0);
  const latestUploadHydratedRef = useRef(false);
  const latestManualHydratedRef = useRef(false);

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    let active = true;
    const hydrateLatestUploads = async () => {
      if (latestUploadHydratedRef.current) return;
      if (authLoading || !session) return;
      if (files.length > 0 || uploadSummary || flowStage !== "idle") return;
      latestUploadHydratedRef.current = true;
      setLatestUploadError(null);
      try {
        const latestUploads = await apiClient.getLatestUploads();
        if (!active || !latestUploads || latestUploads.length === 0) return;
        setUploadSummary(buildLatestUploadsSummary(latestUploads));
        setLatestUploadLabel(latestUploads[0]?.file_name ?? null);
        setFlowStage("summary");
        console.info("verify.latest_uploads.hydrated", {
          count: latestUploads.length,
          latest_task_id: latestUploads[0]?.task_id,
        });
      } catch (err: unknown) {
        if (!active) return;
        const message = resolveApiErrorMessage(err, "verify.latest_uploads.hydrate");
        console.error("verify.latest_uploads.hydrate_failed", { error: message });
        setLatestUploadError("Unable to load the latest upload. Please check History.");
      }
    };
    void hydrateLatestUploads();
    return () => {
      active = false;
    };
  }, [authLoading, files.length, flowStage, session, uploadSummary]);

  useEffect(() => {
    let active = true;
    const hydrateLatestManual = async () => {
      if (latestManualHydratedRef.current) return;
      if (authLoading || !session) return;
      if (manualTaskId || results.length > 0 || manualEmails.length > 0 || inputValue.trim().length > 0) return;
      latestManualHydratedRef.current = true;
      try {
        const latest = await apiClient.getLatestManual();
        if (!active || !latest) return;
        setManualTaskId(latest.task_id);
        if (!active) return;
        applyManualStored(latest);
      } catch (err: unknown) {
        if (!active) return;
        const message = resolveApiErrorMessage(err, "verify.manual.hydrate");
        console.error("verify.manual.hydrate_failed", { error: message });
        setErrors(message);
      }
    };
    void hydrateLatestManual();
    return () => {
      active = false;
    };
  }, [authLoading, inputValue, manualEmails.length, manualTaskId, results.length, session]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        setExportMenuOpen(false);
        return;
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [exportMenuOpen]);

  const applyManualEmails = (emails: string[]) => {
    if (!emails.length) return;
    setManualEmails(emails);
    setInputValue((prev) => (prev.trim().length > 0 ? prev : emails.join("\n")));
  };

  const applyManualStored = (latest: LatestManualResponse) => {
    const emails = latest.manual_emails ?? [];
    if (emails.length > 0) {
      applyManualEmails(emails);
    }
    setResults(buildManualResultsFromStored(emails, latest.manual_results));
    setErrors(null);
    setExportError(null);
  };

  const refreshManualResults = async () => {
    setExportError(null);
    setManualRefreshing(true);
    try {
      const latest = await apiClient.getLatestManual();
      if (!latest) {
        setErrors("No recent manual verification found.");
        return;
      }
      setManualTaskId(latest.task_id);
      applyManualStored(latest);
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, "verify.manual.refresh");
      console.error("verify.manual.refresh_failed", { error: message });
      setErrors(message);
    } finally {
      setManualRefreshing(false);
    }
  };

  const resolveExportResults = async (): Promise<VerificationResult[]> => {
    if (!manualTaskId || results.length === 0) {
      throw new Error("No manual verification results to export.");
    }
    let latest: LatestManualResponse | null = null;
    try {
      latest = await apiClient.getLatestManual();
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, "verify.manual.export_latest");
      console.error("verify.manual.export_latest_failed", { error: message });
      return results;
    }
    if (!latest) {
      console.warn("verify.manual.export_latest_missing");
      return results;
    }
    if (latest.task_id !== manualTaskId) {
      console.warn("verify.manual.export_task_mismatch", {
        current_task_id: manualTaskId,
        latest_task_id: latest.task_id,
      });
      return results;
    }
    if (!latest.manual_results || latest.manual_results.length === 0) {
      console.warn("verify.manual.export_missing_results", { task_id: latest.task_id });
      return results;
    }
    return buildManualResultsFromStored(latest.manual_emails, latest.manual_results);
  };

  const handleExport = async (action: "copy" | "download") => {
    if (exportAction) return;
    setExportError(null);
    setExportAction(action);
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
      if (action === "copy") {
        if (!navigator.clipboard?.writeText) {
          setExportError("Clipboard access is unavailable.");
          return;
        }
        await navigator.clipboard.writeText(csv);
        setToast("Results copied to clipboard.");
      } else {
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
      }
      console.info("verify.manual.export_success", {
        action,
        count: exportResults.length,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : resolveApiErrorMessage(err, "verify.manual.export");
      console.error("verify.manual.export_failed", { error: message });
      setExportError(message);
    } finally {
      setExportAction(null);
      setExportMenuOpen(false);
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
    setExportMenuOpen(false);
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
    const randomUUID = globalThis.crypto?.randomUUID;
    if (typeof randomUUID !== "function") {
      setErrors("Unable to start verification. Please refresh and try again.");
      return;
    }
    const batchId = randomUUID.call(globalThis.crypto);
    setErrors(null);
    setManualTaskId(batchId);
    setManualEmails(parsed);
    setResults(mapVerifyFallbackResults(parsed, batchId));
    setIsSubmitting(true);
    try {
      let firstBatchPayload = true;
      const errorsForBatch: string[] = [];
      for (const email of parsed) {
        try {
          const requestId = getVerifyRequestId(email, { forceNew: true });
          const response = await apiClient.verifyEmail(email, {
            requestId,
            batchId,
            batchEmails: firstBatchPayload ? parsed : undefined,
          });
          clearVerifyRequestId(email);
          const status = response.status || "unknown";
          const message = response.message || `Status: ${status}`;
          setResults((prev) =>
            prev.map((item) =>
              item.email === email
                ? {
                    ...item,
                    status,
                    message,
                    validatedAt: response.validated_at,
                    isRoleBased: response.is_role_based,
                  }
                : item,
            ),
          );
          firstBatchPayload = false;
        } catch (err: unknown) {
          const message = resolveApiErrorMessage(err, "verify.manual.per_email");
          console.error("verify.manual.per_email_failed", { email, error: message });
          errorsForBatch.push(`${email}: ${message}`);
          setResults((prev) =>
            prev.map((item) =>
              item.email === email ? { ...item, status: "unknown", message } : item,
            ),
          );
        }
      }
      if (errorsForBatch.length > 0) {
        setErrors(errorsForBatch[0]);
      }
      setToast(`Verified ${parsed.length} email${parsed.length === 1 ? "" : "s"}`);
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

  const resetUpload = () => {
    setFiles([]);
    setFileColumns({});
    setUploadSummary(null);
    setFlowStage("idle");
    setColumnMapping({});
    setFirstRowHasLabels(true);
    setRemoveDuplicates(true);
    setFileError(null);
    setFileNotice(null);
    setLatestUploadError(null);
    setLatestUploadRefreshing(false);
    setLatestUploadLabel(null);
  };

  const validationSlices = useMemo(() => {
    if (!uploadSummary || uploadSummary.files.length === 0) {
      return [];
    }
    const latestRow = uploadSummary.files[0];
    const valid = latestRow.valid ?? uploadSummary.aggregates.valid ?? 0;
    const invalid = latestRow.invalid ?? uploadSummary.aggregates.invalid ?? 0;
    const catchAll = latestRow.catchAll ?? uploadSummary.aggregates.catchAll ?? 0;
    const processedTotal = valid + invalid + catchAll;
    const totalEmails = latestRow.totalEmails ?? uploadSummary.totalEmails;
    const processing =
      typeof totalEmails === "number" && Number.isFinite(totalEmails)
        ? Math.max(totalEmails - processedTotal, 0)
        : 0;
    const slices = [
      { name: "Valid", value: valid, color: "#00b69b" },
      { name: "Catch-all", value: catchAll, color: "#ff990a" },
      { name: "Invalid", value: invalid, color: "#597cff" },
    ];
    if (processing > 0) {
      slices.push({ name: "Processing", value: processing, color: "#cbd5f5" });
    }
    return slices.filter((slice) => slice.value > 0);
  }, [uploadSummary]);

  const validPercent = useMemo(() => {
    if (
      !uploadSummary ||
      uploadSummary.totalEmails === null ||
      uploadSummary.totalEmails === undefined ||
      uploadSummary.totalEmails === 0 ||
      uploadSummary.aggregates.valid === null
    ) {
      return null;
    }
    return Math.round((uploadSummary.aggregates.valid / uploadSummary.totalEmails) * 100);
  }, [uploadSummary]);

  const showSummaryState = flowStage === "summary" && uploadSummary;
  const hasSecondaryContent = flowStage === "popup1" || flowStage === "popup2" || showSummaryState;
  const exportDisabled = results.length === 0 || exportAction !== null;
  const exportLabel =
    exportAction === "copy" ? "Copying..." : exportAction === "download" ? "Downloading..." : "Export";

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
      let summary: UploadSummary | null = null;
      try {
        const latestUploads = await apiClient.getLatestUploads();
        if (latestUploads && latestUploads.length > 0) {
          summary = buildLatestUploadsSummary(latestUploads);
          setLatestUploadLabel(latestUploads[0]?.file_name ?? null);
        }
      } catch (err: unknown) {
        const message = resolveApiErrorMessage(err, "verify.latest_uploads.after_upload");
        console.error("verify.latest_uploads.after_upload_failed", { error: message });
      }
      if (!summary) {
        summary = buildUploadSummary(files, links, new Map(), startedAt);
        setLatestUploadLabel(summary.files[0]?.fileName ?? null);
      }
      setUploadSummary(summary);
      setFlowStage("summary");
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
    setLatestUploadError(null);
    setLatestUploadRefreshing(true);
    try {
      const latestUploads = await apiClient.getLatestUploads();
      if (!latestUploads || latestUploads.length === 0) {
        setUploadSummary(null);
        setFlowStage("idle");
        setLatestUploadLabel(null);
        setLatestUploadError("No recent uploads found. Upload a file to get started.");
        return;
      }
      const detailsByTaskId = new Map<string, TaskDetailResponse>();
      await Promise.all(
        latestUploads.map(async (entry) => {
          if (!entry.task_id) return;
          try {
            const detail = await fetchTaskDetailWithRetries(entry.task_id);
            if (detail) {
              detailsByTaskId.set(entry.task_id, detail);
            }
          } catch (err: unknown) {
            const message = resolveApiErrorMessage(err, "verify.latest_uploads.detail");
            if (err instanceof ApiError && err.status === 402) {
              setLatestUploadError(message);
              return;
            }
            console.error("verify.latest_uploads.detail_failed", { task_id: entry.task_id, error: message });
          }
        }),
      );
      setUploadSummary(buildLatestUploadsSummary(latestUploads, detailsByTaskId));
      setLatestUploadLabel(latestUploads[0]?.file_name ?? null);
      setFlowStage("summary");
      console.info("verify.latest_uploads.refreshed", {
        count: latestUploads.length,
        latest_task_id: latestUploads[0]?.task_id,
      });
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, "verify.latest_uploads.refresh");
      console.error("verify.latest_uploads.refresh_failed", { error: message });
      setLatestUploadError(message);
    } finally {
      setLatestUploadRefreshing(false);
    }
  };

  const handleDownload = async (file: UploadSummary["files"][number]) => {
    if (!file.taskId) {
      setFileError("Download unavailable for this file.");
      return;
    }
    if (!file.fileName) {
      setFileError("Download unavailable without a file name.");
      return;
    }
    setFileError(null);
    setActiveDownload(file.taskId);
    try {
      const { blob, fileName } = await apiClient.downloadTaskResults(file.taskId, file.fileName);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      console.info("verify.download.success", { task_id: file.taskId, file_name: fileName });
    } catch (err: unknown) {
      const message = resolveApiErrorMessage(err, "verify.download");
      console.error("verify.download.failed", { task_id: file.taskId, error: message });
      setFileError(message);
    } finally {
      setActiveDownload(null);
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
            <div className="mt-4">
              <textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                rows={8}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 shadow-inner outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
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
              className="mt-4 w-full rounded-lg bg-[#ffe369] px-4 py-3 text-center text-sm font-bold uppercase text-slate-900 shadow-sm transition hover:bg-[#ffd84d] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
            >
              {isSubmitting ? "Verifying..." : "Verify"}
            </button>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-slate-900">Results</h2>
              <div className="flex items-center gap-2">
                <div className="relative" ref={exportMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (exportDisabled) return;
                      setExportMenuOpen((prev) => !prev);
                    }}
                    disabled={exportDisabled}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
                    aria-expanded={exportMenuOpen}
                  >
                    {exportLabel}
                  </button>
                  {exportMenuOpen ? (
                    <div className="absolute right-0 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 text-left text-xs font-semibold text-slate-700 shadow-lg">
                      <button
                        type="button"
                        onClick={() => void handleExport("copy")}
                        disabled={exportAction !== null}
                        className="w-full rounded-md px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Copy CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleExport("download")}
                        disabled={exportAction !== null}
                        className="w-full rounded-md px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Download CSV
                      </button>
                    </div>
                  ) : null}
                </div>
                {manualTaskId ? (
                  <button
                    type="button"
                    onClick={() => void refreshManualResults()}
                    disabled={manualRefreshing}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
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
            <div className="mt-4 min-h-[220px] rounded-xl border border-slate-200 bg-slate-50 p-4">
              {results.length === 0 ? (
                <p className="text-sm font-semibold text-slate-500">
                  Results will appear here after verification.
                </p>
              ) : (
                <div className="space-y-2">
                  {results.map((item) => (
                    <div
                      key={item.email}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
                    >
                      <span>{item.email}</span>
                      <span className="text-xs font-bold uppercase text-[#4c61cc]">
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
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-[#4c61cc] shadow-sm transition hover:border-[#4c61cc]"
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
            {latestUploadError && !uploadSummary && flowStage === "idle" ? (
              <div className="mt-2 flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                <AlertCircle className="h-4 w-4" />
                {latestUploadError}
              </div>
            ) : null}
          </div>

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
                    className="text-sm font-semibold text-[#4c61cc] underline"
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    onClick={proceedToMapping}
                    disabled={isSubmitting}
                    className="rounded-lg bg-[#4c61cc] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f52ad] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
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
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
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
                    className="text-sm font-semibold text-[#4c61cc] underline"
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    onClick={proceedToSummary}
                    disabled={isSubmitting}
                    className="rounded-lg bg-[#4c61cc] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f52ad] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
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
                    <p className="text-sm font-semibold text-slate-600">{uploadSummary?.uploadDate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void refreshLatestUploads()}
                      disabled={latestUploadRefreshing}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
                    >
                      {latestUploadRefreshing ? "Refreshing..." : "Refresh status"}
                    </button>
                  </div>
                </div>
                {latestUploadError ? (
                  <div className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" role="alert">
                    {latestUploadError}
                  </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-5 bg-slate-50 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      <span>File name</span>
                      <span className="text-center">Total</span>
                      <span className="text-center">Valid</span>
                      <span className="text-center">Invalid</span>
                      <span className="text-right">Action</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {uploadSummary?.files.map((file, index) => (
                        <div
                          key={`${file.taskId ?? "pending"}-${file.fileName}-${index}`}
                          className="grid grid-cols-5 items-center px-3 py-2 text-sm font-semibold text-slate-800"
                        >
                          <span className="truncate" title={file.fileName}>
                            {file.fileName}
                          </span>
                          <span className="text-center text-slate-700">{formatNumber(file.totalEmails)}</span>
                          <span className="text-center text-emerald-600">{formatNumber(file.valid)}</span>
                          <span className="text-center text-rose-600">{formatNumber(file.invalid)}</span>
                          <span className="flex justify-end">
                            {file.status === "download" && file.taskId ? (
                              <button
                                type="button"
                                onClick={() => void handleDownload(file)}
                                disabled={activeDownload === file.taskId}
                                className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {activeDownload === file.taskId ? "Downloading..." : "Download"}
                              </button>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                                Pending
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Valid Emails</p>
                        <p className="text-3xl font-extrabold text-slate-900">
                          {validPercent === null ? "—" : `${validPercent}%`}
                        </p>
                        <p
                          className="mt-1 text-xs font-semibold text-slate-500"
                          title={latestUploadLabel ?? undefined}
                        >
                          {latestUploadLabel ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height={256}>
                        <RePieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                          <Pie
                            data={validationSlices}
                            dataKey="value"
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={2}
                          >
                            {validationSlices.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            cursor={{ fill: "transparent" }}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                            }}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {toast ? (
          <div className="fixed bottom-6 right-6 z-10 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-slate-700">
            {toast}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-xs font-bold text-slate-200 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </section>
    </DashboardShell>
  );
}
