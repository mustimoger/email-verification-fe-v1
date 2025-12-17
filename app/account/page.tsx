"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import { apiClient, ApiError, Credits, Profile } from "../lib/api-client";

type Purchase = {
  id: string;
  email: string;
  amount: string;
  creditsBought: string;
  expireDate: string;
};

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileDraft, setProfileDraft] = useState<{ email?: string; display_name?: string }>({});
  const [credits, setCredits] = useState<Credits | null>(null);
  const [purchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { session, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setCredits(null);
      setError(null);
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, c] = await Promise.all([apiClient.getProfile(), apiClient.getCredits()]);
        setProfile(p);
        setProfileDraft({ email: p.email ?? "", display_name: p.display_name ?? "" });
        setCredits(c);
      } catch (err: unknown) {
        const message = err instanceof ApiError ? err.message : "Failed to load account";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [session]);

  const handleUpdate = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiClient.updateProfile(profileDraft);
      setProfile(updated);
      setProfileDraft({ email: updated.email ?? "", display_name: updated.display_name ?? "" });
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Update failed";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <DashboardShell>
        <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-slate-700">
          Checking session...
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <RequireAuth>
        <section className="flex flex-col gap-8">
        <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200">
          <div className="flex justify-center">
            <div className="flex flex-col items-center">
              <div className="relative h-16 w-16 overflow-hidden rounded-full">
                <Image src="/profile-image.png" alt="Profile" fill className="object-cover" sizes="64px" />
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
              <label className="text-xs font-semibold text-slate-500">Display Name</label>
              <input
                value={profileDraft.display_name ?? ""}
                onChange={(event) => setProfileDraft((prev) => ({ ...prev, display_name: event.target.value }))}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <input
                value={profileDraft.email ?? ""}
                onChange={(event) => setProfileDraft((prev) => ({ ...prev, email: event.target.value }))}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-[#4c61cc] focus:ring-1 focus:ring-[#4c61cc]"
              />
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>
          ) : null}

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={handleUpdate}
              disabled={saving || loading}
              className="w-40 rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c61cc]"
            >
              {saving ? "Updating..." : "Update"}
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
              {purchases.length === 0 ? (
                <div className="px-4 py-4 text-sm font-semibold text-slate-600">No purchases yet.</div>
              ) : (
                purchases.map((row) => (
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
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800">Total Credits</h3>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-2 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              <span>Total Credits Remaining</span>
              <span className="text-right font-extrabold text-slate-800">
                {credits ? credits.credits_remaining.toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </div>

        {loading ? <div className="text-sm font-semibold text-slate-600">Loading account...</div> : null}
      </section>
      </RequireAuth>
    </DashboardShell>
  );
}
