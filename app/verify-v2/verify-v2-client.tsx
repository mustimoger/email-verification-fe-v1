"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../components/auth-provider";
import { DashboardShell } from "../components/dashboard-shell";
import { apiClient, ApiError, type LimitsResponse, type TaskEmailJob } from "../lib/api-client";
import {
  buildManualExportCsv,
  buildManualResultsFromJobs,
  mapVerifyFallbackResults,
  normalizeEmails,
  resolveApiErrorMessage,
  shouldHydrateManualState,
  type VerificationResult,
} from "../verify/utils";
import styles from "./verify-v2.module.css";
import {
  ManualVerificationCard,
  ResultsCard,
  UploadSection,
  VerifyHero,
  WorkflowSection,
  type ResultsStatusCounts,
} from "./verify-v2-sections";

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
  const [limits, setLimits] = useState<LimitsResponse | null>(null);
  const [limitsError, setLimitsError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const manualStateHydratedRef = useRef(false);

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
        <UploadSection transitionClass={transitionClass} />
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
