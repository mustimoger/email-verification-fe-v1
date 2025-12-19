"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import { AlertCircle, UploadCloud, X } from "lucide-react";
import { Cell, Pie, PieChart as RePieChart, ResponsiveContainer } from "recharts";

import { DashboardShell } from "../components/dashboard-shell";
import { apiClient, ApiError, type LimitsResponse } from "../lib/api-client";
import { buildColumnOptions, FileColumnError, readFileColumnInfo, type FileColumnInfo } from "./file-columns";
import {
  buildUploadSummary,
  createUploadLinks,
  formatNumber,
  mapTaskDetailToResults,
  mapUploadResultsToLinks,
  mapVerifyFallbackResults,
  normalizeEmails,
  type UploadSummary,
  type VerificationResult,
} from "./utils";

const TASK_POLL_ATTEMPTS = 3;
const TASK_POLL_INTERVAL_MS = 2000;

export default function VerifyPage() {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [errors, setErrors] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [limits, setLimits] = useState<LimitsResponse | null>(null);
  const [limitsError, setLimitsError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileColumns, setFileColumns] = useState<Record<string, FileColumnInfo>>({});
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [flowStage, setFlowStage] = useState<"idle" | "popup1" | "popup2" | "summary">("idle");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [firstRowHasLabels, setFirstRowHasLabels] = useState<boolean>(true);
  const [removeDuplicates, setRemoveDuplicates] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef({ active: false });
  const parseRef = useRef(0);

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

  const pollTaskDetail = async (taskId: string, emails: string[]) => {
    pollRef.current.active = true;
    for (let attempt = 1; attempt <= TASK_POLL_ATTEMPTS; attempt += 1) {
      try {
        const detail = await apiClient.getTask(taskId);
        if (detail?.jobs && detail.jobs.length > 0) {
          const mapped = mapTaskDetailToResults(emails, detail);
          setResults(mapped);
          const hasPending = detail.jobs.some((job) => {
            const status = (job.status || "").toLowerCase();
            return status === "pending" || status === "processing";
          });
          if (!hasPending) {
            pollRef.current.active = false;
            return;
          }
        }
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.details || err.message : "Task lookup failed";
        console.error("verify.task_poll_failed", { taskId, attempt, error: message });
      }
      if (attempt < TASK_POLL_ATTEMPTS) {
        await wait(TASK_POLL_INTERVAL_MS);
      }
    }
    pollRef.current.active = false;
  };

  const fetchTaskDetailWithRetries = async (taskId: string) => {
    for (let attempt = 1; attempt <= TASK_POLL_ATTEMPTS; attempt += 1) {
      try {
        const detail = await apiClient.getTask(taskId);
        return detail;
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.details || err.message : "Task lookup failed";
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
      const response = await apiClient.createTask(parsed);
      const taskId = response.id ?? null;
      setResults(mapVerifyFallbackResults(parsed, taskId));
      setToast(taskId ? `Task created (${parsed.length} emails)` : `Task queued (${parsed.length} emails)`);
      if (taskId) {
        await pollTaskDetail(taskId, parsed);
      }
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.details || err.message : "Verification failed";
      setErrors(typeof message === "string" ? message : "Verification failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilesSelected = (fileList: FileList | null) => {
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
    const maxBytes = maxMb * 1024 * 1024;
    const tooLarge = incoming.find((file) => file.size > maxBytes);
    if (tooLarge) {
      setFileError(`${tooLarge.name} exceeds the ${maxMb} MB limit.`);
      return;
    }
    setFileError(null);
    setFiles(incoming);
    const initialLinks = createUploadLinks(incoming);
    const summary = buildUploadSummary(incoming, initialLinks, new Map());
    setUploadSummary(summary);
    setFlowStage("popup1");
    setColumnMapping(Object.fromEntries(summary.files.map((file) => [file.fileName, ""])));

    console.info("[verify/upload] files selected", {
      count: incoming.length,
      names: incoming.map((f) => f.name),
      totalEmails: summary.totalEmails,
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFilesSelected(event.dataTransfer.files);
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
  };

  const validationSlices = useMemo(() => {
    if (
      !uploadSummary ||
      uploadSummary.totalEmails === null ||
      uploadSummary.totalEmails === undefined ||
      uploadSummary.totalEmails === 0 ||
      uploadSummary.aggregates.valid === null ||
      uploadSummary.aggregates.catchAll === null ||
      uploadSummary.aggregates.invalid === null
    ) {
      return [];
    }
    return [
      { name: "Valid", value: uploadSummary.aggregates.valid, color: "#00b69b" },
      { name: "Catch-all", value: uploadSummary.aggregates.catchAll, color: "#ff990a" },
      { name: "Invalid", value: uploadSummary.aggregates.invalid, color: "#597cff" },
    ];
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

  const proceedToMapping = () => {
    if (!uploadSummary) return;
    setFlowStage("popup2");
  };

  const proceedToSummary = async () => {
    if (!uploadSummary) return;
    setIsSubmitting(true);
    try {
      if (files.length === 0) {
        setFileError("No file to upload.");
        return;
      }
      setFileError(null);
      const startedAt = new Date().toISOString();
      const uploadResults = await apiClient.uploadTaskFiles(files);
      const { links, unmatched, orphaned } = mapUploadResultsToLinks(files, uploadResults);
      const taskIds = links.map((link) => link.taskId).filter((id): id is string => Boolean(id));
      const details = await Promise.all(taskIds.map((taskId) => fetchTaskDetailWithRetries(taskId)));
      const detailsByTaskId = new Map<string, NonNullable<(typeof details)[number]>>();
      taskIds.forEach((taskId, index) => {
        const detail = details[index];
        if (detail) {
          detailsByTaskId.set(taskId, detail);
        }
      });
      const summary = buildUploadSummary(files, links, detailsByTaskId, startedAt);
      setUploadSummary(summary);
      setFlowStage("summary");
      setToast("Upload submitted");
      const pendingFiles = summary.files.filter((file) => file.taskId && file.status === "pending");
      if (unmatched > 0) {
        setFileError("Some uploads did not return a task id. Check History for updates.");
      } else if (pendingFiles.length > 0) {
        setFileError("Processing is still running. Check History for the latest status.");
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
        task_ids: taskIds,
        unmatched,
      });
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.details || err.message : "Upload failed";
      setFileError(typeof message === "string" ? message : "Upload failed");
    } finally {
      setIsSubmitting(false);
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
            <h2 className="text-lg font-extrabold text-slate-900">Results</h2>
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
                  onChange={(event) => handleFilesSelected(event.target.files)}
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
                        <option value="email">Email</option>
                        <option value="address">Address</option>
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
                      onChange={(event) => setRemoveDuplicates(event.target.checked)}
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
                      onClick={resetUpload}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
                    >
                      Upload Another File
                    </button>
                  </div>
                </div>

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
                      {uploadSummary?.files.map((file) => (
                        <div
                          key={file.fileName}
                          className="grid grid-cols-5 items-center px-3 py-2 text-sm font-semibold text-slate-800"
                        >
                          <span className="truncate" title={file.fileName}>
                            {file.fileName}
                          </span>
                          <span className="text-center text-slate-700">{formatNumber(file.totalEmails)}</span>
                          <span className="text-center text-emerald-600">{formatNumber(file.valid)}</span>
                          <span className="text-center text-rose-600">{formatNumber(file.invalid)}</span>
                          <span className="flex justify-end">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                                file.status === "download"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {file.status === "download" ? "Download" : "Pending"}
                            </span>
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
                      </div>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer>
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
