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
  billingApi,
  externalApiClient,
  IntegrationOption,
  TaskListResponse,
  VerificationMetricsResponse,
} from "../lib/api-client";
import { APP_CONFIG } from "../lib/app-config";
import { EXTERNAL_DATA_UNAVAILABLE } from "../lib/messages";
import { listIntegrationsCatalog } from "../lib/integrations-catalog";
import {
  aggregateValidationCounts,
  buildUsageSeriesFromMetrics,
  buildVerificationTotalsFromMetrics,
  buildIntegrationLabelMap,
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
} from "./overview-sections";
import styles from "./overview.module.css";

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

type PlanSummary = {
  label: string | null;
  planNames: string[];
  purchasedAt?: string | null;
  isMulti: boolean;
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
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);
  const [verificationMetrics, setVerificationMetrics] = useState<VerificationMetricsResponse | null>(null);
  const [recentTasks, setRecentTasks] = useState<TaskListResponse["tasks"]>([]);
  const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null);
  const [integrationOptions, setIntegrationOptions] = useState<IntegrationOption[]>([]);
  const [tasksResponse, setTasksResponse] = useState<TaskListResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewLoaded, setOverviewLoaded] = useState(false);
  const [tasksPaging, setTasksPaging] = useState(false);
  const [tasksRefreshing, setTasksRefreshing] = useState(false);
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
    if (authLoading || !session) {
      setCreditsBalance(null);
      setVerificationMetrics(null);
      setRecentTasks([]);
      setOverviewLoaded(false);
      setOverviewLoading(false);
      return;
    }
    const loadOverviewData = async () => {
      setOverviewLoading(true);
      setOverviewLoaded(false);
      const rangeEnd = new Date();
      const rangeStart = new Date(rangeEnd);
      rangeStart.setMonth(rangeStart.getMonth() - APP_CONFIG.overviewUsageRangeMonths);
      const [creditsResult, metricsResult, tasksResult] = await Promise.allSettled([
        externalApiClient.getCreditBalance(),
        externalApiClient.getVerificationMetrics({ from: rangeStart.toISOString(), to: rangeEnd.toISOString() }),
        externalApiClient.listTasks(5, 0),
      ]);
      if (creditsResult.status === "fulfilled") {
        setCreditsBalance(creditsResult.value.balance ?? null);
      } else {
        const message =
          creditsResult.reason instanceof ApiError ? creditsResult.reason.message : "Failed to load credits";
        console.warn("overview.credits.load_failed", { error: message });
      }
      if (metricsResult.status === "fulfilled") {
        setVerificationMetrics(metricsResult.value);
      } else {
        const message =
          metricsResult.reason instanceof ApiError ? metricsResult.reason.message : "Failed to load metrics";
        console.warn("overview.metrics.load_failed", { error: message });
      }
      if (tasksResult.status === "fulfilled") {
        setRecentTasks(tasksResult.value.tasks ?? []);
      } else {
        const message =
          tasksResult.reason instanceof ApiError ? tasksResult.reason.message : "Failed to load tasks";
        console.warn("overview.recent_tasks.load_failed", { error: message });
      }
      setOverviewLoading(false);
      setOverviewLoaded(true);
    };
    void loadOverviewData();
  }, [authLoading, session]);

  useEffect(() => {
    if (authLoading || !session) {
      setPlanSummary(null);
      return;
    }
    const loadIntegrations = async () => {
      try {
        const options = await listIntegrationsCatalog();
        setIntegrationOptions(options);
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load integrations";
        console.warn("overview.integrations.failed", { error: message });
      }
    };
    void loadIntegrations();
  }, [authLoading, session]);

  useEffect(() => {
    if (authLoading || !session) return;
    const loadPlan = async () => {
      try {
        const [purchases, plans] = await Promise.all([
          apiClient.getPurchases(1, 0),
          billingApi.listPlans(),
        ]);
        const latestPurchase = purchases.items?.[0];
        const priceIds = Array.isArray(latestPurchase?.price_ids) ? latestPurchase?.price_ids ?? [] : [];
        if (!latestPurchase || priceIds.length === 0) {
          setPlanSummary(null);
          return;
        }
        const priceNameMap = new Map<string, string>();
        (plans.plans ?? []).forEach((plan) => {
          const planName = plan.name?.trim();
          if (!planName) return;
          Object.values(plan.prices ?? {}).forEach((price) => {
            const priceId = price.price_id?.trim();
            if (!priceId) return;
            priceNameMap.set(priceId, planName);
          });
        });
        const planNames = priceIds
          .map((priceId) => priceNameMap.get(priceId))
          .filter((name): name is string => Boolean(name));
        const isMulti = priceIds.length > 1;
        const label = isMulti ? "Multiple items" : planNames[0] ?? null;
        setPlanSummary({
          label,
          planNames,
          purchasedAt: latestPurchase.purchased_at ?? null,
          isMulti,
        });
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load plan";
        console.warn("overview.plan.load_failed", { error: message });
        setPlanSummary(null);
      }
    };
    void loadPlan();
  }, [authLoading, session]);

  const validationTotals = useMemo(() => {
    const totals = buildVerificationTotalsFromMetrics(verificationMetrics);
    if (totals) return totals;
    if (recentTasks && recentTasks.length > 0) {
      return aggregateValidationCounts(recentTasks);
    }
    return null;
  }, [recentTasks, verificationMetrics]);

  const resolvedValidationTotals = useMemo(
    () =>
      validationTotals ?? {
        valid: 0,
        invalid: 0,
        catchAll: 0,
        roleBased: 0,
        disposable: 0,
        total: 0,
      },
    [validationTotals],
  );

  const stats: Stat[] = useMemo(() => {
    const missingValueLabel = "Unavailable";
    const creditsValue =
      creditsBalance === null || creditsBalance === undefined ? null : creditsBalance.toLocaleString();
    const totalVerifications = validationTotals?.total ?? null;
    const valid = validationTotals?.valid ?? null;
    const invalid = validationTotals?.invalid ?? null;
    const catchAll = validationTotals?.catchAll ?? null;
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
  }, [creditsBalance, validationTotals]);

  const validationData: ValidationSlice[] = useMemo(() => {
    const slices = [
      { name: "Valid", value: resolvedValidationTotals.valid, color: "var(--chart-valid)" },
      { name: "Catch-all", value: resolvedValidationTotals.catchAll, color: "var(--chart-catchall)" },
      { name: "Invalid", value: resolvedValidationTotals.invalid, color: "var(--chart-invalid)" },
    ];
    return slices.filter((slice) => slice.value > 0);
  }, [resolvedValidationTotals]);

  const validationHasData = resolvedValidationTotals.total > 0;
  const validationPills = useMemo(
    () => [
      { label: "Invalid", value: resolvedValidationTotals.invalid, color: "var(--chart-invalid)" },
      { label: "Valid", value: resolvedValidationTotals.valid, color: "var(--chart-valid)" },
      { label: "Catch-all", value: resolvedValidationTotals.catchAll, color: "var(--chart-catchall)" },
      { label: "Disposable", value: resolvedValidationTotals.disposable ?? 0, color: "var(--chart-processing)" },
    ],
    [resolvedValidationTotals],
  );

  const usageData: UsagePoint[] = useMemo(
    () => buildUsageSeriesFromMetrics(verificationMetrics),
    [verificationMetrics],
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
    if (!recentTasks || recentTasks.length === 0) return [];
    return [...recentTasks]
      .sort((left, right) => compareCreatedAtDesc(left.created_at, right.created_at))
      .map((task) => mapTaskToOverviewTask(task, integrationLabels))
      .filter((task): task is OverviewTask => task !== null);
  }, [integrationLabels, recentTasks, tasksResponse]);

  const tasksLoading = tasksPaging || tasksRefreshing;
  const taskError = tasksError ?? null;
  const currentPlan = planSummary;
  const missingPlanLabel = "Unavailable";
  const planName = currentPlan?.label ?? (currentPlan?.planNames?.[0] || missingPlanLabel);
  const purchaseDate =
    currentPlan?.purchasedAt ? new Date(currentPlan.purchasedAt).toLocaleDateString() : missingPlanLabel;

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
        if (options?.refresh) {
          console.info("overview.tasks.refresh_requested", { page_index: pageIndex });
        }
        const response = await externalApiClient.listTasks(TASKS_PAGE_SIZE, offset);
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

          <StatsGrid stats={stats} loading={!overviewLoaded || overviewLoading} transitionClass={transitionClass} />

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
              planNames={currentPlan?.isMulti ? currentPlan.planNames : undefined}
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
