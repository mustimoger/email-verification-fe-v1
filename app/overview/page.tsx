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
import { apiClient, ApiError, OverviewResponse } from "../lib/api-client";
import { aggregateValidationCounts, mapOverviewTask, TaskStatus, OverviewTask } from "./utils";

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

const statusColor: Record<TaskStatus, string> = {
  Completed: "bg-emerald-500",
  Running: "bg-amber-400",
  Cancelled: "bg-rose-500",
};

export default function OverviewPage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  const validationTotals = useMemo(() => aggregateValidationCounts(overview?.recent_tasks), [overview]);

  const stats: Stat[] = useMemo(() => {
    const credits = overview?.credits_remaining ?? 0;
    const totalVerifications = overview?.usage_total ?? 0;
    return [
      { title: "Credits Remaining", value: credits.toLocaleString(), icon: CheckCircle2 },
      { title: "Total Verifications", value: totalVerifications.toLocaleString(), icon: CheckCircle2 },
      { title: "Total Invalid", value: validationTotals.invalid.toLocaleString(), icon: CircleDollarSign },
      { title: "Total Catch-all", value: validationTotals.catchAll.toLocaleString(), icon: Leaf },
    ];
  }, [overview, validationTotals]);

  const validationData: ValidationSlice[] = useMemo(() => {
    const slices = [
      { name: "Valid", value: validationTotals.valid, color: "#0eb38b" },
      { name: "Catch-all", value: validationTotals.catchAll, color: "#f6c34d" },
      { name: "Invalid", value: validationTotals.invalid, color: "#ff6b6b" },
    ];
    if (!overview) return slices;
    return slices.filter((slice) => slice.value > 0);
  }, [overview, validationTotals]);

  const usageData: UsagePoint[] = useMemo(
    () => (overview?.usage_series ?? []).map((p) => ({ date: p.date, count: p.count })),
    [overview],
  );

  const tasks: OverviewTask[] = useMemo(() => {
    if (!overview?.recent_tasks) return [];
    return overview.recent_tasks.map(mapOverviewTask);
  }, [overview]);

  const anyData = overview !== null;

  return (
    <DashboardShell>
      <RequireAuth>
        <section className="mt-4 grid gap-4 lg:grid-cols-4">
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
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-slate-900">Credit Usage</p>
              <LineIcon className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-4 h-[260px] w-full">
              <ResponsiveContainer height={260}>
                <ReLineChart data={usageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} width={30} />
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
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-slate-900">Current Plan</p>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-[#4c61cc] shadow-inner">
              <LineIcon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-6 text-2xl font-extrabold text-amber-500">
              {overview?.profile?.display_name || "Enterprise"}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
              <span className="text-sm font-semibold">Purchase Date</span>
            </div>
            <p className="mt-3 text-xl font-bold text-slate-900">—</p>
            <p className="text-sm text-slate-600">Purchase Date</p>
          </div>
        </section>

        <section className="mt-5 rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-slate-900">Verification Tasks</h2>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-600">Month</label>
              <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4c61cc] focus:outline-none">
                <option>All</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
            <div className="grid grid-cols-6 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              <span>Task Name</span>
              <span>Number Of Emails</span>
              <span>Date - Time</span>
              <span className="text-right">Valid</span>
              <span className="text-right">Invalid</span>
              <span className="text-right">Status</span>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="px-4 py-4 text-sm font-semibold text-slate-600">Loading tasks...</div>
              ) : error ? (
                <div className="px-4 py-4 text-sm font-semibold text-rose-600">{error}</div>
              ) : tasks.length === 0 ? (
                <div className="px-4 py-4 text-sm font-semibold text-slate-600">No tasks yet.</div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="grid grid-cols-6 items-center px-4 py-4 text-sm text-slate-800"
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
                    <span className="flex justify-end">
                      <span
                        className={[
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm",
                          statusColor[task.status],
                        ].join(" ")}
                      >
                        <span className="inline-block h-2 w-2 rounded-full bg-white/80" />
                        {task.status}
                        <ChevronRight className="h-4 w-4 text-white/80" />
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          {error && !loading ? (
            <div className="mt-3 text-sm font-semibold text-rose-600">{error}</div>
          ) : null}
        </section>
      </RequireAuth>
    </DashboardShell>
  );
}
