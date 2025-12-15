"use client";

import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import {
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardShell } from "../components/dashboard-shell";

type ApiKey = {
  id: string;
  name: string;
  maskedKey: string;
  status: "active" | "disabled";
};

type UsagePoint = {
  date: string;
  processed: number;
  valid: number;
  invalid: number;
};

const apiKeys: ApiKey[] = [
  { id: "key-1", name: "Master Key", maskedKey: "8608****", status: "active" },
  { id: "key-2", name: "Secondary Key", maskedKey: "1923****", status: "disabled" },
];

const usageData: UsagePoint[] = [
  { date: "12/06", processed: 100, valid: 80, invalid: 20 },
  { date: "12/07", processed: 120, valid: 90, invalid: 30 },
  { date: "12/08", processed: 90, valid: 70, invalid: 20 },
  { date: "12/09", processed: 130, valid: 100, invalid: 30 },
  { date: "12/10", processed: 150, valid: 120, invalid: 30 },
  { date: "12/11", processed: 160, valid: 130, invalid: 30 },
  { date: "12/12", processed: 140, valid: 110, invalid: 30 },
  { date: "12/13", processed: 170, valid: 135, invalid: 35 },
];

const statusStyle: Record<ApiKey["status"], string> = {
  active: "bg-emerald-100 text-emerald-700",
  disabled: "bg-slate-200 text-slate-600",
};

export default function ApiPage() {
  const [selectedKey, setSelectedKey] = useState(apiKeys[0]?.id ?? "");
  const [dateRange, setDateRange] = useState({
    from: "12/06/2025",
    to: "12/13/2025",
  });

  const chartData = useMemo(() => usageData, []);

  const handleSeeUsage = () => {
    console.info("[api/usage] see usage clicked", { selectedKey, dateRange });
  };

  const handleDownload = () => {
    console.info("[api/usage] download clicked", { selectedKey, dateRange });
  };

  return (
    <DashboardShell>
      <section className="space-y-6">
        <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200">
          <h2 className="text-lg font-extrabold text-slate-900">API Keys</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-4 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-700 md:text-sm">
              <span>API key name</span>
              <span>API key</span>
              <span>Status</span>
              <span className="text-right">Edit</span>
            </div>
            <div className="divide-y divide-slate-100">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="grid grid-cols-4 items-center px-4 py-3 text-sm font-semibold text-slate-800 md:text-base"
                >
                  <span className="text-slate-700">{key.name}</span>
                  <span className="text-slate-700">{key.maskedKey}</span>
                  <span>
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
                        statusStyle[key.status],
                      ].join(" ")}
                    >
                      {key.status === "active" ? "Active" : "Disabled"}
                    </span>
                  </span>
                  <span className="flex justify-end">
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
                      onClick={() =>
                        console.info("[api/keys] edit clicked", { key: key.id })
                      }
                    >
                      Edit
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-extrabold text-slate-900">API Usage</h2>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Select API key
              </label>
              <select
                value={selectedKey}
                onChange={(event) => setSelectedKey(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              >
                {apiKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.name} ({key.maskedKey})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Date range
              </label>
              <div className="flex items-center gap-2">
                <div className="relative w-full">
                  <input
                    value={dateRange.from}
                    onChange={(event) =>
                      setDateRange((prev) => ({ ...prev, from: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
                <div className="relative w-full">
                  <input
                    value={dateRange.to}
                    onChange={(event) =>
                      setDateRange((prev) => ({ ...prev, to: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSeeUsage}
              className="rounded-lg bg-[#4c61cc] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3f52ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
            >
              See Usage
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#4c61cc] hover:text-[#4c61cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
            >
              Download
            </button>
          </div>

          <div className="mt-6 h-72 w-full rounded-xl border border-slate-200 bg-slate-50 p-3">
            {chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-600">
                No usage data available for the selected range.
              </div>
            ) : (
              <ResponsiveContainer>
                <ReLineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="valid"
                    stroke="#00b69b"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#00b69b", strokeWidth: 2, stroke: "white" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="invalid"
                    stroke="#ff6b6b"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#ff6b6b", strokeWidth: 2, stroke: "white" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="processed"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "white" }}
                  />
                </ReLineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
