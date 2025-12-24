"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { CheckCircle2, ChevronRight, CircleDollarSign, Leaf, PieChart, LineChart as LineIcon } from "lucide-react";
import {
  Cell,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardShell } from "../components/dashboard-shell";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import { apiClient, ApiError, IntegrationOption, OverviewResponse, Task } from "../lib/api-client";
import {
  aggregateValidationCounts,
  buildIntegrationLabelMap,
  mapOverviewTask,
  mapTaskToOverviewTask,
  TaskStatus,
  OverviewTask,
  summarizeJobStatus,
  StatusBreakdown,
} from "./utils";

type Stat = {
  title: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
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

const statusColor: Record<TaskStatus, string> = {
  Completed: "bg-emerald-500",
  Running: "bg-amber-400",
  Cancelled: "bg-rose-500",
};
const STATUS_PILL: Record<string, string> = {
  Processing: "bg-amber-400",
  Failed: "bg-rose-500",
  Completed: "bg-emerald-500",
  Unknown: "bg-slate-400",
};
const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-300",
  processing: "bg-amber-500",
  completed: "bg-emerald-500",
  failed: "bg-rose-500",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export default function OverviewPage() {
  const { session, loading: authLoading } = useAuth();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [integrationOptions, setIntegrationOptions] = useState<IntegrationOption[]>([]);
  const [tasksOverride, setTasksOverride] = useState<Task[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tasksRefreshing, setTasksRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [statusPopover, setStatusPopover] = useState<StatusPopover | null>(null);

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
        total: totals.total ?? 0,
      };
    }
    return aggregateValidationCounts(overview?.recent_tasks);
  }, [overview]);

  const stats: Stat[] = useMemo(() => {
    const credits = overview?.credits_remaining ?? null;
    const totalVerifications = overview?.usage_total ?? null;
    const valid = overview?.verification_totals?.valid ?? null;
    const invalid = overview?.verification_totals?.invalid ?? null;
    const catchAll = overview?.verification_totals?.catchall ?? null;
    return [
      { title: "Credits Remaining", value: credits !== null ? credits.toLocaleString() : "—", icon: CheckCircle2 },
      {
        title: "Total Verifications",
        value: totalVerifications !== null ? totalVerifications.toLocaleString() : "—",
        icon: CheckCircle2,
      },
      { title: "Total Valid", value: valid !== null ? valid.toLocaleString() : "—", icon: CheckCircle2 },
      { title: "Total Invalid", value: invalid !== null ? invalid.toLocaleString() : "—", icon: CircleDollarSign },
      { title: "Total Catch-all", value: catchAll !== null ? catchAll.toLocaleString() : "—", icon: Leaf },
    ];
  }, [overview]);

  const validationData: ValidationSlice[] = useMemo(() => {
    const slices = [
      { name: "Valid", value: validationTotals.valid, color: "#0eb38b" },
      { name: "Catch-all", value: validationTotals.catchAll, color: "#f6c34d" },
      { name: "Invalid", value: validationTotals.invalid, color: "#ff6b6b" },
    ];
    if (!overview) return slices;
    return slices.filter((slice) => slice.value > 0);
  }, [overview, validationTotals]);
  const validationHasData = validationTotals.total > 0;

  const usageData: UsagePoint[] = useMemo(
    () => (overview?.usage_series ?? []).map((p) => ({ date: p.date, count: p.count })),
    [overview],
  );

  const integrationLabels = useMemo(
    () => buildIntegrationLabelMap(integrationOptions),
    [integrationOptions],
  );

  const tasks: OverviewTask[] = useMemo(() => {
    if (tasksOverride) {
      return tasksOverride
        .map((task) => mapTaskToOverviewTask(task, integrationLabels))
        .filter((task): task is OverviewTask => task !== null);
    }
    if (!overview?.recent_tasks) return [];
    return overview.recent_tasks.map((task) => mapOverviewTask(task, integrationLabels));
  }, [overview, integrationLabels, tasksOverride]);

  const anyData = overview !== null;
  const tasksLoading = loading || tasksRefreshing;
  const taskError = tasksError ?? error;
  const currentPlan = overview?.current_plan;
  const planName = currentPlan?.label ?? (currentPlan?.plan_names?.[0] || "—");
  const purchaseDate =
    currentPlan?.purchased_at ? new Date(currentPlan.purchased_at).toLocaleDateString() : "—";

  const handleRefreshTasks = async () => {
    setTasksRefreshing(true);
    setTasksError(null);
    try {
      const response = await apiClient.listTasks(5, 0, undefined, true);
      setTasksOverride(response.tasks ?? []);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Failed to refresh tasks";
      console.warn("overview.tasks.refresh_failed", { error: message });
      setTasksError(message);
    } finally {
      setTasksRefreshing(false);
    }
  };

  const handleToggleStatus = (taskId: string, summary: StatusBreakdown) => {
    setStatusPopover((prev) => (prev?.id === taskId ? null : { id: taskId, summary }));
  };

  return (
    <DashboardShell>
      <RequireAuth>
        <section className="mt-4 grid gap-4 lg:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-600">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-[#4c61cc] shadow-inner">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                {!anyData ? (
                  <div className="mt-3 text-xs font-semibold text-slate-500">Loading...</div>
                ) : null}
              </div>
            );
          })}
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-slate-900">Validation</p>
              <PieChart className="h-5 w-5 text-slate-400" />
            </div>
          <div className="mt-4 h-[260px] w-full">
            {validationHasData ? (
                <ResponsiveContainer height={260}>
                  <RePieChart>
                    <Pie
                      data={validationData}
                      dataKey="value"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      startAngle={90}
                      endAngle={450}
                    >
                      {validationData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
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
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                No validation data yet.
              </div>
            )}
          </div>
          {validationHasData ? (
            <p className="mt-3 text-center text-xs font-semibold text-slate-500">
              Hover the chart to see exact numbers.
            </p>
          ) : null}
        </div>

          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-slate-900">Credit Usage</p>
              <LineIcon className="h-5 w-5 text-slate-400" />
            </div>
          <div className="mt-4 h-[260px] w-full">
            {usageData.length ? (
                <ResponsiveContainer height={260}>
                  <ReLineChart data={usageData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} width={40} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "white" }}
                    />
                  </ReLineChart>
                </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                No credit usage yet.
              </div>
            )}
          </div>
        </div>

          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-slate-900">Current Plan</p>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-[#4c61cc] shadow-inner">
              <LineIcon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6 text-2xl font-extrabold text-amber-500">{planName}</div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
              <span className="text-sm font-semibold">Purchase Date</span>
            </div>
            <p className="mt-3 text-xl font-bold text-slate-900">{purchaseDate}</p>
            <p className="text-sm text-slate-600">Purchase Date</p>
            {currentPlan?.label === "Multiple items" && currentPlan.plan_names?.length ? (
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p className="font-semibold text-slate-700">Items</p>
                <div className="flex flex-wrap gap-2">
                  {currentPlan.plan_names.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-slate-900">Verification Tasks</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRefreshTasks}
                disabled={tasksRefreshing}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
              >
                {tasksRefreshing ? "Refreshing..." : "Refresh"}
              </button>
              <label className="text-sm font-semibold text-slate-600">Month</label>
              <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4c61cc] focus:outline-none">
                <option>All</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-visible rounded-xl border border-slate-100">
            <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.8fr_0.9fr_1.4fr] bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              <span>Task Name</span>
              <span>Total Emails</span>
              <span>Date</span>
              <span className="text-right">Valid</span>
              <span className="text-right">Invalid</span>
              <span className="text-right">Catch-All</span>
              <span className="text-right">Status</span>
            </div>
            <div className="divide-y divide-slate-100">
              {tasksLoading ? (
                <div className="px-4 py-4 text-sm font-semibold text-slate-600">Loading tasks...</div>
              ) : taskError ? (
                <div className="px-4 py-4 text-sm font-semibold text-rose-600">{taskError}</div>
              ) : tasks.length === 0 ? (
                <div className="px-4 py-4 text-sm font-semibold text-slate-600">No tasks yet.</div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="relative grid grid-cols-[1.2fr_0.9fr_0.9fr_0.8fr_0.8fr_0.9fr_1.4fr] items-center px-4 py-4 text-sm text-slate-800"
                  >
                    <span className="font-semibold text-slate-700">{task.name}</span>
                    <span className="font-semibold text-slate-700">
                      {task.emails.toLocaleString()}
                    </span>
                    <span className="font-semibold text-slate-700">{task.date}</span>
                    <span className="text-right font-semibold text-slate-700">
                      {task.valid.toLocaleString()}
                    </span>
                    <span className="text-right font-semibold text-slate-700">
                      {task.invalid.toLocaleString()}
                    </span>
                    <span className="text-right font-semibold text-slate-700">
                      {task.catchAll.toLocaleString()}
                    </span>
                    <span className="flex justify-end">
                      {(() => {
                        const summary = summarizeJobStatus(task.jobStatus);
                        return (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(task.id, summary)}
                        className={[
                          "relative inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm transition",
                          STATUS_PILL[summary.label],
                        ].join(" ")}
                      >
                        <span className="inline-block h-2 w-2 rounded-full bg-white/80" />
                        {summary.label} {summary.total.toLocaleString()}
                        <ChevronRight className="h-4 w-4 text-white/80" />
                      </button>
                        );
                      })()}
                      {statusPopover?.id === task.id ? (
                        <div className="absolute right-8 z-20 mt-10 w-56 rounded-xl border border-slate-200 bg-white/50 p-3 text-xs font-semibold text-slate-700 shadow-lg backdrop-blur">
                          {Object.keys(statusPopover.summary.counts).length === 0 ? (
                            <div className="text-slate-600">No job status yet.</div>
                          ) : (
                            <div className="space-y-2">
                              {Object.entries(statusPopover.summary.counts).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    <span className={["h-2 w-2 rounded-full", STATUS_DOT[key] || "bg-slate-300"].join(" ")} />
                                    {STATUS_LABEL[key] || key}
                                  </span>
                                  <span>{value.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          {taskError && !tasksLoading ? (
            <div className="mt-3 text-sm font-semibold text-rose-600">{taskError}</div>
          ) : null}
        </section>
      </RequireAuth>
    </DashboardShell>
  );
}
