"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";

type Purchase = {
  id: string;
  email: string;
  amount: string;
  creditsBought: string;
  expireDate: string;
};

const purchases: Purchase[] = [
  {
    id: "00001",
    email: "Christine Brooks",
    amount: "089 Kutch Green Apt. 448",
    creditsBought: "14 Feb 2019",
    expireDate: "Never",
  },
  {
    id: "00002",
    email: "Rosie Pearson",
    amount: "979 Immanuel Ferry Suite 526",
    creditsBought: "14 Feb 2019",
    expireDate: "Never",
  },
  {
    id: "00005",
    email: "Alan Cain",
    amount: "042 Mylene Throughway",
    creditsBought: "14 Feb 2019",
    expireDate: "Never",
  },
  {
    id: "00006",
    email: "Alfred Murray",
    amount: "543 Weimann Mountain",
    creditsBought: "14 Feb 2019",
    expireDate: "Never",
  },
];

const totalCredits = {
  purchased: 260000,
  used: 250000,
};

export default function AccountPage() {
  const [profile, setProfile] = useState({
    username: "Kevin",
    email: "Fleming",
    currentPassword: "jaskolski.brent@yahoo.com",
    newPassword: "546-933-2772",
  });

  const purchaseRows = useMemo(() => purchases, []);

  const handleUpdate = () => {
    console.info("[account/update]", profile);
  };

  return (
    <DashboardShell>
      <section className="flex flex-col gap-8">
        <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="flex justify-center">
            <div className="flex flex-col items-center">
              <div className="relative h-16 w-16 overflow-hidden rounded-full">
                <Image
                  src="/profile-image.png"
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-sky-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                onClick={() => console.info("[account] edit photo clicked")}
              >
                Edit Photo
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Username</label>
              <input
                value={profile.username}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, username: event.target.value }))
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <input
                value={profile.email}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, email: event.target.value }))
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Current Password</label>
              <input
                value={profile.currentPassword}
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    currentPassword: event.target.value,
                  }))
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">New Password</label>
              <input
                value={profile.newPassword}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, newPassword: event.target.value }))
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleUpdate}
              className="w-40 rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
            >
              Update
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800">Purchase History</h3>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-6 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-700 md:text-sm">
              <span>Date</span>
              <span>Checkout Email</span>
              <span>Purchase Amount</span>
              <span>Credits Bought</span>
              <span>Expire Date</span>
              <span className="text-right">Invoice</span>
            </div>
            <div className="divide-y divide-slate-100">
              {purchaseRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-6 items-center px-4 py-4 text-sm font-semibold text-slate-800"
                >
                  <span className="text-slate-700">{row.id}</span>
                  <span className="text-slate-700">{row.email}</span>
                  <span className="text-slate-700">{row.amount}</span>
                  <span className="text-slate-700">{row.creditsBought}</span>
                  <span className="text-slate-700">{row.expireDate}</span>
                  <span className="flex justify-end">
                    <span className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                      Download
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800">Total Credits</h3>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-2 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              <span>Total Credits Purchased</span>
              <span className="text-right font-extrabold text-slate-800">
                {totalCredits.purchased.toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-2 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <span>Total Credits Used</span>
              <span className="text-right font-extrabold text-slate-800">
                {totalCredits.used.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
