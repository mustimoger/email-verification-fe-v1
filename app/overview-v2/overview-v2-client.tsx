"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import {
  BadgeCheck,
  CheckCheck,
  CircleX,
  MailQuestionMark,
  Wallet,
} from "lucide-react";

import { DashboardShell } from "../components/dashboard-shell";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import {
  apiClient,
  ApiError,
  IntegrationOption,
  OverviewResponse,
  TaskListResponse,
} from "../lib/api-client";
import { EXTERNAL_DATA_UNAVAILABLE } from "../lib/messages";
import {
  aggregateValidationCounts,
  buildIntegrationLabelMap,
  mapOverviewTask,
  mapTaskToOverviewTask,
  type OverviewTask,
  type StatusBreakdown,
} from "../overview/utils";
import {
  OverviewHero,
  PlanCard,
  StatsGrid,
  TasksSection,
  UsageCard,
  ValidationCard,
} from "./overview-v2-sections";
import styles from "./overview-v2.module.css";

type Stat = {
  title: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  helper?: string | null;
};

type ValidationSlice = {
  name: string;
  value: number;
  color: string;
};

type UsagePoint = {
  date: string;
  count: number;
};

type StatusPopover = {
  id: string;
  summary: StatusBreakdown;
};

const TASKS_PAGE_SIZE = 10;

const compareCreatedAtDesc = (left?: string | null, right?: string | null) => {
  const leftTime = left ? Date.parse(left) : Number.NaN;
  const rightTime = right ? Date.parse(right) : Number.NaN;
  if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) return 0;
  if (Number.isNaN(leftTime)) return 1;
  if (Number.isNaN(rightTime)) return -1;
  return rightTime - leftTime;
};

export default function OverviewV2Client() {
  const { session, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [integrationOptions, setIntegrationOptions] = useState<IntegrationOption[]>([]);
  const [tasksResponse, setTasksResponse] = useState<TaskListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tasksPaging, setTasksPaging] = useState(false);
  const [tasksRefreshing, setTasksRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [statusPopover, setStatusPopover] = useState<StatusPopover | null>(null);
  const [tasksPageIndex, setTasksPageIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const handle = window.requestAnimationFrame(() => setChartsReady(true));
    return () => window.cancelAnimationFrame(handle);
  }, []);

  useEffect(() => {
    if (authLoading || !session) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.getOverview();
        setOverview(data);
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load overview";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [authLoading, session]);

  useEffect(() => {
    if (authLoading || !session) return;
    const loadIntegrations = async () => {
      try {
        const options = await apiClient.listIntegrations();
        setIntegrationOptions(options);
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load integrations";
        console.warn("overview.integrations.failed", { error: message });
      }
    };
    void loadIntegrations();
  }, [authLoading, session]);

  const validationTotals = useMemo(() => {
    const totals = overview?.verification_totals;
    if (totals) {
      return {
        valid: totals.valid ?? 0,
        invalid: totals.invalid ?? 0,
        catchAll: totals.catchall ?? 0,
        disposable: totals.disposable ?? 0,
        total: totals.total ?? 0,
      };
    }
    return { ...aggregateValidationCounts(overview?.recent_tasks), disposable: 0 };
  }, [overview]);

  const stats: Stat[] = useMemo(() => {
    const missingValueLabel = "Unavailable";
    const credits = overview?.credits_remaining;
    const creditsValue = credits === null || credits === undefined ? null : credits.toLocaleString();
    const totalVerifications = overview?.usage_total ?? null;
    const valid = overview?.verification_totals?.valid ?? null;
    const invalid = overview?.verification_totals?.invalid ?? null;
    const catchAll = overview?.verification_totals?.catchall ?? null;
    return [
      {
        title: "Credits Remaining",
        value: creditsValue ?? missingValueLabel,
        helper: creditsValue ? null : EXTERNAL_DATA_UNAVAILABLE,
        icon: Wallet,
      },
      {
        title: "Total Verifications",
        value: totalVerifications !== null ? totalVerifications.toLocaleString() : missingValueLabel,
        icon: CheckCheck,
      },
      { title: "Total Valid", value: valid !== null ? valid.toLocaleString() : missingValueLabel, icon: BadgeCheck },
      { title: "Total Invalid", value: invalid !== null ? invalid.toLocaleString() : missingValueLabel, icon: CircleX },
      { title: "Total Catch-all", value: catchAll !== null ? catchAll.toLocaleString() : missingValueLabel, icon: MailQuestionMark },
    ];
  }, [overview]);

  const validationData: ValidationSlice[] = useMemo(() => {
    const slices = [
      { name: "Valid", value: validationTotals.valid, color: "var(--chart-valid)" },
      { name: "Catch-all", value: validationTotals.catchAll, color: "var(--chart-catchall)" },
      { name: "Invalid", value: validationTotals.invalid, color: "var(--chart-invalid)" },
    ];
    if (!overview) return slices;
    return slices.filter((slice) => slice.value > 0);
  }, [overview, validationTotals]);

  const validationHasData = validationTotals.total > 0;
  const validationPills = useMemo(
    () => [
      { label: "Invalid", value: validationTotals.invalid, color: "var(--chart-invalid)" },
      { label: "Valid", value: validationTotals.valid, color: "var(--chart-valid)" },
      { label: "Catch-all", value: validationTotals.catchAll, color: "var(--chart-catchall)" },
      { label: "Disposable", value: validationTotals.disposable ?? 0, color: "var(--chart-processing)" },
    ],
    [validationTotals],
  );

  const usageData: UsagePoint[] = useMemo(
    () => (overview?.usage_series ?? []).map((point) => ({ date: point.date, count: point.count })),
    [overview],
  );

  const integrationLabels = useMemo(
    () => buildIntegrationLabelMap(integrationOptions),
    [integrationOptions],
  );

  const tasks: OverviewTask[] = useMemo(() => {
    if (tasksResponse) {
      const items = tasksResponse.tasks ?? [];
      return [...items]
        .sort((left, right) => compareCreatedAtDesc(left.created_at, right.created_at))
        .map((task) => mapTaskToOverviewTask(task, integrationLabels))
        .filter((task): task is OverviewTask => task !== null);
    }
    if (!overview?.recent_tasks) return [];
    return [...overview.recent_tasks]
      .sort((left, right) => compareCreatedAtDesc(left.created_at, right.created_at))
      .map((task) => mapOverviewTask(task, integrationLabels));
  }, [overview, integrationLabels, tasksResponse]);

  const anyData = overview !== null;
  const tasksLoading = tasksPaging || tasksRefreshing || (loading && !tasksResponse);
  const taskError = tasksError ?? (tasksResponse ? null : error);
  const currentPlan = overview?.current_plan;
  const missingPlanLabel = "Unavailable";
  const planName = currentPlan?.label ?? (currentPlan?.plan_names?.[0] || missingPlanLabel);
  const purchaseDate =
    currentPlan?.purchased_at ? new Date(currentPlan.purchased_at).toLocaleDateString() : missingPlanLabel;

  const fetchTasksPage = useCallback(
    async (pageIndex: number, options?: { refresh?: boolean; source?: "initial" | "page" | "refresh" }) => {
      if (authLoading || !session) return;
      const source = options?.source ?? "page";
      if (source === "refresh") {
        setTasksRefreshing(true);
      } else {
        setTasksPaging(true);
      }
      setTasksError(null);
      try {
        const offset = pageIndex * TASKS_PAGE_SIZE;
        const response = await apiClient.listTasks(TASKS_PAGE_SIZE, offset, undefined, options?.refresh);
        setTasksResponse(response);
        setTasksPageIndex(pageIndex);
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load tasks";
        console.warn("overview.tasks.fetch_failed", { error: message, page_index: pageIndex });
        setTasksError(message);
      } finally {
        if (source === "refresh") {
          setTasksRefreshing(false);
        } else {
          setTasksPaging(false);
        }
      }
    },
    [authLoading, session],
  );

  const handleRefreshTasks = async () => {
    await fetchTasksPage(tasksPageIndex, { refresh: true, source: "refresh" });
  };

  useEffect(() => {
    if (authLoading || !session) {
      setTasksResponse(null);
      setTasksPageIndex(0);
      setTasksError(null);
      return;
    }
    void fetchTasksPage(0, { source: "initial" });
  }, [authLoading, session, fetchTasksPage]);

  const handleToggleStatus = (taskId: string, summary: StatusBreakdown) => {
    setStatusPopover((prev) => (prev?.id === taskId ? null : { id: taskId, summary }));
  };

  useEffect(() => {
    if (!statusPopover) return;
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        setStatusPopover(null);
        return;
      }
      const container = document.querySelector(`[data-status-container="${statusPopover.id}"]`);
      if (!container || !container.contains(target)) {
        setStatusPopover(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [statusPopover]);

  const totalTasks = typeof tasksResponse?.count === "number" ? tasksResponse.count : null;
  const totalPages = totalTasks === null ? null : Math.max(1, Math.ceil(totalTasks / TASKS_PAGE_SIZE));
  const currentPage = tasksPageIndex + 1;
  const showingStart = totalTasks === null ? null : totalTasks === 0 ? 0 : tasksPageIndex * TASKS_PAGE_SIZE + 1;
  const showingEnd = totalTasks === null ? null : Math.min(totalTasks, tasksPageIndex * TASKS_PAGE_SIZE + tasks.length);
  const paginationReady = totalTasks !== null && totalPages !== null;
  const paginationBusy = tasksPaging || tasksRefreshing;
  const canGoPrev = paginationReady && tasksPageIndex > 0 && !paginationBusy;
  const canGoNext = paginationReady && totalPages !== null && tasksPageIndex + 1 < totalPages && !paginationBusy;
  const showTasksLoading = tasksLoading && tasks.length === 0;
  const paginationLabel = paginationReady ? `Showing ${showingStart}-${showingEnd} of ${totalTasks}` : null;

  const transitionClass = isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6";

  return (
    <DashboardShell>
      <RequireAuth>
        <section className={`${styles.root} relative flex flex-col gap-8 pb-8 lg:px-8`}>
          <OverviewHero transitionClass={transitionClass} />

          <StatsGrid stats={stats} loading={!anyData} transitionClass={transitionClass} />

          <div className={`grid gap-6 lg:grid-cols-[1.3fr_1.3fr_1fr] ${transitionClass}`}>
            <ValidationCard
              data={validationData}
              pills={validationPills}
              hasData={validationHasData}
              isReady={chartsReady}
            />
            <UsageCard data={usageData} isReady={chartsReady} />
            <PlanCard
              planName={planName}
              purchaseDate={purchaseDate}
              planNames={currentPlan?.label === "Multiple items" ? currentPlan.plan_names ?? undefined : undefined}
            />
          </div>

          <TasksSection
            tasks={tasks}
            loading={tasksRefreshing}
            error={taskError}
            statusPopover={statusPopover}
            onToggleStatus={handleToggleStatus}
            onRefresh={handleRefreshTasks}
            onPrev={() => fetchTasksPage(tasksPageIndex - 1, { source: "page" })}
            onNext={() => fetchTasksPage(tasksPageIndex + 1, { source: "page" })}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            paginationLabel={paginationLabel}
            transitionClass={transitionClass}
            showTasksLoading={showTasksLoading}
          />
        </section>
      </RequireAuth>
    </DashboardShell>
  );
}
