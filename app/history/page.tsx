"use client";

import { useMemo } from "react";

import { DashboardShell } from "../components/dashboard-shell";

type HistoryRow = {
  id: string;
  date: string;
  filename: string;
  total: number;
  valid: number;
  invalid: number;
  catchAll: number;
  status: "download" | "pending";
};

const rows: HistoryRow[] = [
  {
    id: "row-1",
    date: "04 Sep 2019",
    filename: "filename1.csv",
    total: 11850,
    valid: 9250,
    invalid: 1274,
    catchAll: 954,
    status: "download",
  },
  {
    id: "row-2",
    date: "04 Sep 2019",
    filename: "filename2.csv",
    total: 11850,
    valid: 9250,
    invalid: 1274,
    catchAll: 954,
    status: "download",
  },
  {
    id: "row-3",
    date: "04 Sep 2019",
    filename: "filename3.csv",
    total: 11850,
    valid: 9250,
    invalid: 1274,
    catchAll: 954,
    status: "pending",
  },
  {
    id: "row-4",
    date: "04 Sep 2019",
    filename: "filename4.csv",
    total: 11850,
    valid: 9250,
    invalid: 1274,
    catchAll: 954,
    status: "download",
  },
  {
    id: "row-5",
    date: "04 Sep 2019",
    filename: "filename5.csv",
    total: 11850,
    valid: 9250,
    invalid: 1274,
    catchAll: 954,
    status: "download",
  },
  {
    id: "row-6",
    date: "04 Sep 2019",
    filename: "filename6.csv",
    total: 11850,
    valid: 9250,
    invalid: 1274,
    catchAll: 954,
    status: "download",
  },
  {
    id: "row-7",
    date: "04 Sep 2019",
    filename: "filename7.csv",
    total: 11850,
    valid: 9250,
    invalid: 1274,
    catchAll: 954,
    status: "download",
  },
  {
    id: "row-8",
    date: "04 Sep 2019",
    filename: "filename8.csv",
    total: 11850,
    valid: 9250,
    invalid: 1274,
    catchAll: 954,
    status: "pending",
  },
  {
    id: "row-9",
    date: "04 Sep 2019",
    filename: "filename9.csv",
    total: 11850,
    valid: 9250,
    invalid: 1274,
    catchAll: 954,
    status: "download",
  },
];

const statusColor: Record<HistoryRow["status"], string> = {
  download: "bg-emerald-500",
  pending: "bg-amber-400",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export default function HistoryPage() {
  const displayRows = useMemo(() => rows, []);

  return (
    <DashboardShell>
      <section className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200 lg:p-6">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-6 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-700 md:text-sm">
            <span>Date</span>
            <span>Filename/Total</span>
            <span className="text-right">Valid</span>
            <span className="text-right">Invalid</span>
            <span className="text-right">Catch-all</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-slate-100">
            {displayRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-6 items-center px-4 py-4 text-sm font-semibold text-slate-800 md:text-base"
              >
                <span className="text-slate-700">{row.date}</span>
                <span className="text-slate-700">
                  {row.filename} / {formatNumber(row.total)}
                </span>
                <span className="text-right text-slate-700">
                  {formatNumber(row.valid)}
                </span>
                <span className="text-right text-slate-700">
                  {formatNumber(row.invalid)}
                </span>
                <span className="text-right text-slate-700">
                  {formatNumber(row.catchAll)}
                </span>
                <span className="flex justify-end">
                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm",
                      statusColor[row.status],
                    ].join(" ")}
                  >
                    {row.status === "download" ? "Download" : "Pending"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 text-sm font-semibold text-slate-600">
          Showing 1-09 of 78
        </div>
      </section>
    </DashboardShell>
  );
}
