"use client";

import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Cell,
  Pie,
  PieChart as RePieChart,
  LineChart as ReLineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronRight, LineChart as LineIcon, Package, PieChart } from "lucide-react";

import type { OverviewTask, StatusBreakdown } from "../overview/utils";
import { summarizeJobStatus } from "../overview/utils";

type StatItem = {
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

const STATUS_PILL: Record<string, string> = {
  Processing: "bg-[var(--status-warning)]",
  Failed: "bg-[var(--status-danger)]",
  Completed: "bg-[var(--status-success)]",
  Unknown: "bg-[var(--status-unknown)]",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-[var(--status-warning)]",
  processing: "bg-[var(--status-warning)]",
  completed: "bg-[var(--status-success)]",
  failed: "bg-[var(--status-danger)]",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const usageAxisTickStyle = {
  fill: "var(--text-muted)",
  fontSize: 12,
  fontWeight: 600,
};

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}

function SectionCard({
  children,
  className,
  transitionClass,
  delay = "0s",
}: {
  children: ReactNode;
  className?: string;
  transitionClass?: string;
  delay?: string;
}) {
  return (
    <div
      className={`rounded-[24px] border border-[var(--overview-border)] bg-[var(--overview-card)] p-6 shadow-[var(--overview-shadow)] sm:p-8 ${transitionClass ?? ""} ${className ?? ""}`}
      style={{ transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}` }}
    >
      {children}
    </div>
  );
}

export function OverviewHero({ transitionClass }: { transitionClass?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-[var(--overview-border)] bg-[var(--overview-card-strong)] px-6 py-10 shadow-[var(--overview-shadow-strong)] sm:px-10 ${transitionClass ?? ""}`}
      style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--overview-border)] bg-[var(--overview-accent-soft)] px-4 py-2 text-xs font-semibold tracking-[0.2em] text-[var(--overview-accent)]">
            <span className="h-2 w-2 rounded-full bg-[var(--overview-accent)]" />
            DASHBOARD OVERVIEW
          </div>
          <h1 className="mt-6 text-3xl font-semibold text-[var(--text-primary)] sm:text-5xl">
            Track every verification with
            <span className="bg-[linear-gradient(135deg,var(--overview-accent)_0%,var(--overview-accent-strong)_100%)] bg-clip-text text-transparent">
              {" "}
              clarity
            </span>
          </h1>
          <p className="mt-4 text-base text-[var(--text-secondary)] sm:text-lg">
            See credit usage, validation quality, and verification status in one streamlined view.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/verify"
              className="rounded-xl bg-[linear-gradient(135deg,var(--overview-accent)_0%,var(--overview-accent-strong)_100%)] px-6 py-3 text-sm font-semibold text-[var(--overview-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)]"
            >
              Start Verification
            </Link>
            <Link
              href="/history"
              className="rounded-xl border border-[var(--overview-border)] bg-white/70 px-6 py-3 text-sm font-semibold text-[var(--text-secondary)]"
            >
              View History
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {["Live usage tracking", "Granular status insights", "Credits never expire"].map((label) => (
            <div
              key={label}
              className="rounded-2xl border border-[var(--overview-border)] bg-[var(--overview-card-muted)] px-4 py-4 text-sm font-semibold text-[var(--text-secondary)]"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsGrid({
  stats,
  loading,
  transitionClass,
}: {
  stats: StatItem[];
  loading: boolean;
  transitionClass?: string;
}) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-5 ${transitionClass ?? ""}`}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className="rounded-2xl border border-[var(--overview-border)] bg-[var(--overview-card)] p-5 shadow-[var(--overview-shadow)]"
          >
            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  {stat.title}
                </p>
                <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{stat.value}</p>
                {stat.helper ? (
                  <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">{stat.helper}</p>
                ) : null}
                {loading ? (
                  <p className="mt-2 text-xs font-semibold text-[var(--text-muted)]">Loading...</p>
                ) : null}
              </div>
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[var(--overview-accent-soft)] text-[var(--overview-accent)]">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ValidationCard({
  data,
  pills,
  hasData,
  isReady = true,
  transitionClass,
}: {
  data: ValidationSlice[];
  pills: { label: string; value: number; color: string }[];
  hasData: boolean;
  isReady?: boolean;
  transitionClass?: string;
}) {
  const { ref: chartRef, size: chartSize } = useElementSize<HTMLDivElement>();
  const chartWidth = Math.max(0, chartSize.width);
  const chartHeight = Math.max(0, chartSize.height);
  const canRenderChart = hasData && isReady && chartWidth > 0 && chartHeight > 0;
  const pieRadius = Math.min(chartWidth, chartHeight) / 2;
  const innerRadius = Math.max(0, Math.round(pieRadius * 0.55));
  const outerRadius = Math.max(innerRadius + 8, Math.round(pieRadius * 0.8));
  return (
    <SectionCard transitionClass={transitionClass} delay="0.1s">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Validation</p>
          <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Quality mix</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--overview-accent-soft)] text-[var(--overview-accent)]">
          <PieChart className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-5 flex h-[260px] w-full flex-col gap-4">
        <div ref={chartRef} className="h-[220px] w-full min-w-[260px]">
          {canRenderChart ? (
            <RePieChart width={chartWidth} height={chartHeight}>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={1}
                minAngle={18}
                startAngle={90}
                endAngle={450}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                }}
              />
            </RePieChart>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--text-muted)]">
              {hasData && isReady ? "Loading chart..." : "No validation data yet."}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {pills.map((pill) => (
            <div
              key={pill.label}
              className="flex items-center justify-between rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: pill.color }}
            >
              <span className="truncate">{pill.label}</span>
              <span className="ml-2 text-xs font-bold tabular-nums text-white/90">
                {pill.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
      {hasData ? (
        <p className="mt-3 text-center text-xs font-semibold text-[var(--text-muted)]">
          Hover the chart to see exact numbers.
        </p>
      ) : null}
    </SectionCard>
  );
}

export function UsageCard({
  data,
  isReady = true,
  transitionClass,
}: {
  data: UsagePoint[];
  isReady?: boolean;
  transitionClass?: string;
}) {
  const { ref: chartRef, size: chartSize } = useElementSize<HTMLDivElement>();
  const chartWidth = Math.max(0, chartSize.width);
  const chartHeight = Math.max(0, chartSize.height);
  const canRenderChart = data.length > 0 && isReady && chartWidth > 0 && chartHeight > 0;
  return (
    <SectionCard transitionClass={transitionClass} delay="0.2s">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Usage</p>
          <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Credit usage trend</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--overview-accent-soft)] text-[var(--overview-accent)]">
          <LineIcon className="h-6 w-6" />
        </div>
      </div>
      <div ref={chartRef} className="mt-5 h-[260px] w-full min-w-[260px]">
        {canRenderChart ? (
          <ReLineChart
            width={chartWidth}
            height={chartHeight}
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={usageAxisTickStyle} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} width={40} tick={usageAxisTickStyle} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--chart-line)"
              strokeWidth={3}
              dot={{
                r: 5,
                fill: "var(--chart-line)",
                strokeWidth: 2,
                stroke: "var(--surface-elevated)",
              }}
            />
          </ReLineChart>
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-[var(--text-muted)]">
            {data.length && isReady ? "Loading chart..." : "No credit usage yet."}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function PlanCard({
  planName,
  purchaseDate,
  planNames,
  transitionClass,
}: {
  planName: string;
  purchaseDate: string;
  planNames?: string[];
  transitionClass?: string;
}) {
  return (
    <SectionCard transitionClass={transitionClass} delay="0.3s">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Plan</p>
          <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Current plan</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--overview-accent-soft)] text-[var(--overview-accent)]">
          <Package className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-6 flex flex-col items-center text-center">
        <div className="text-2xl font-semibold text-[var(--overview-accent)]">{planName}</div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
          <span className="text-sm font-semibold">Purchase Date</span>
        </div>
        <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{purchaseDate}</p>
        {planNames && planNames.length ? (
          <div className="mt-4 w-full space-y-2 text-sm text-[var(--text-secondary)]">
            <p className="font-semibold text-[var(--text-primary)]">Items</p>
            <div className="flex flex-wrap justify-center gap-2">
              {planNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-[var(--overview-border)] bg-[var(--overview-card-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function TasksSection({
  tasks,
  loading,
  error,
  statusPopover,
  onToggleStatus,
  onRefresh,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  paginationLabel,
  transitionClass,
  showTasksLoading,
}: {
  tasks: OverviewTask[];
  loading: boolean;
  error: string | null;
  statusPopover: { id: string; summary: StatusBreakdown } | null;
  onToggleStatus: (taskId: string, summary: StatusBreakdown) => void;
  onRefresh: () => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  paginationLabel: string | null;
  transitionClass?: string;
  showTasksLoading: boolean;
}) {
  return (
    <SectionCard transitionClass={transitionClass} delay="0.4s" className="overflow-hidden">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Activity</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Verification history</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl border border-[var(--overview-border)] bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition hover:border-[var(--overview-accent)] hover:text-[var(--overview-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {showTasksLoading ? (
          <div className="rounded-2xl border border-[var(--overview-border)] bg-[var(--overview-card-muted)] px-4 py-4 text-sm font-semibold text-[var(--text-muted)]">
            Loading tasks...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[var(--overview-border)] bg-[var(--overview-card-muted)] px-4 py-4 text-sm font-semibold text-[var(--status-danger)]">
            {error}
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-[var(--overview-border)] bg-[var(--overview-card-muted)] px-4 py-4 text-sm font-semibold text-[var(--text-muted)]">
            No tasks yet.
          </div>
        ) : (
          tasks.map((task) => {
            const summary = summarizeJobStatus(task.jobStatus);
            return (
              <div
                key={task.id}
                className="relative rounded-2xl border border-[var(--overview-border)] bg-[var(--overview-card-muted)] px-4 py-4 text-sm text-[var(--text-secondary)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{task.name}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">{task.date}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                    {task.emails.toLocaleString()} emails
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <div className="rounded-lg bg-white/70 px-2 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Valid</p>
                    <p className="mt-1">{task.valid.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-2 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Invalid</p>
                    <p className="mt-1">{task.invalid.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-white/70 px-2 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Catch-all</p>
                    <p className="mt-1">{task.catchAll.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end" data-status-container={task.id}>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(task.id, summary)}
                    className={[
                      "relative inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm transition",
                      STATUS_PILL[summary.label],
                    ].join(" ")}
                  >
                    <span className="inline-block h-2 w-2 rounded-full bg-white/80" />
                    {summary.label} {summary.total.toLocaleString()}
                    <ChevronRight className="h-4 w-4 text-white/80" />
                  </button>
                  {statusPopover?.id === task.id ? (
                    <div className="absolute right-4 top-full z-20 mt-3 w-56 rounded-xl border border-[var(--overview-border)] bg-white/90 p-3 text-xs font-semibold text-[var(--text-secondary)] shadow-lg backdrop-blur">
                      {Object.keys(statusPopover.summary.counts).length === 0 ? (
                        <div className="text-[var(--text-muted)]">No job status yet.</div>
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
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <div className="min-w-[860px] overflow-hidden rounded-2xl border border-[var(--overview-border)] bg-[var(--overview-card-muted)]">
          <div className="grid grid-cols-[1.3fr_0.9fr_0.9fr_0.8fr_0.8fr_0.9fr_1.4fr] border-b border-[var(--overview-border)] bg-white/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <span>Task</span>
            <span>Total</span>
            <span>Date</span>
            <span className="text-right">Valid</span>
            <span className="text-right">Invalid</span>
            <span className="text-right">Catch-all</span>
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-[var(--overview-border)]">
            {showTasksLoading ? (
              <div className="px-4 py-4 text-sm font-semibold text-[var(--text-muted)]">Loading tasks...</div>
            ) : error ? (
              <div className="px-4 py-4 text-sm font-semibold text-[var(--status-danger)]">{error}</div>
            ) : tasks.length === 0 ? (
              <div className="px-4 py-4 text-sm font-semibold text-[var(--text-muted)]">No tasks yet.</div>
            ) : (
              tasks.map((task) => {
                const summary = summarizeJobStatus(task.jobStatus);
                return (
                  <div
                    key={task.id}
                    className="relative grid grid-cols-[1.3fr_0.9fr_0.9fr_0.8fr_0.8fr_0.9fr_1.4fr] items-center px-4 py-4 text-sm text-[var(--text-secondary)]"
                  >
                    <span className="font-semibold text-[var(--text-primary)]">{task.name}</span>
                    <span className="font-semibold text-[var(--text-secondary)]">{task.emails.toLocaleString()}</span>
                    <span className="font-semibold text-[var(--text-secondary)]">{task.date}</span>
                    <span className="text-right font-semibold text-[var(--text-secondary)]">
                      {task.valid.toLocaleString()}
                    </span>
                    <span className="text-right font-semibold text-[var(--text-secondary)]">
                      {task.invalid.toLocaleString()}
                    </span>
                    <span className="text-right font-semibold text-[var(--text-secondary)]">
                      {task.catchAll.toLocaleString()}
                    </span>
                    <span className="flex justify-end" data-status-container={task.id}>
                      <button
                        type="button"
                        onClick={() => onToggleStatus(task.id, summary)}
                        className={[
                          "relative inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm transition",
                          STATUS_PILL[summary.label],
                        ].join(" ")}
                      >
                        <span className="inline-block h-2 w-2 rounded-full bg-white/80" />
                        {summary.label} {summary.total.toLocaleString()}
                        <ChevronRight className="h-4 w-4 text-white/80" />
                      </button>
                      {statusPopover?.id === task.id ? (
                        <div className="absolute right-8 z-20 mt-10 w-56 rounded-xl border border-[var(--overview-border)] bg-white/80 p-3 text-xs font-semibold text-[var(--text-secondary)] shadow-lg backdrop-blur">
                          {Object.keys(statusPopover.summary.counts).length === 0 ? (
                            <div className="text-[var(--text-muted)]">No job status yet.</div>
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
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <div>{paginationLabel ? <span>{paginationLabel}</span> : null}</div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canGoPrev}
            className="rounded-xl border border-[var(--overview-border)] bg-white/70 px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition hover:border-[var(--overview-accent)] hover:text-[var(--overview-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className="rounded-xl border border-[var(--overview-border)] bg-white/70 px-3 py-1.5 text-sm font-semibold text-[var(--text-secondary)] shadow-sm transition hover:border-[var(--overview-accent)] hover:text-[var(--overview-accent)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
