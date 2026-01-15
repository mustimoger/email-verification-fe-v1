"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import { apiClient, ApiError, Credits, Profile, Purchase } from "../lib/api-client";
import { EXTERNAL_DATA_UNAVAILABLE } from "../lib/messages";

export default function AccountPage() {
  const backendBase =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
      ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api$/, "")
      : "";
  const resolveAvatar = (url?: string | null) => {
    if (!url || url.trim() === "") return "/profile-image.png";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${backendBase}${url}`;
  };
  const formatDate = (value?: string | null) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };
  const formatAmount = (amount?: number | null, currency?: string | null) => {
    if (amount === undefined || amount === null) return "";
    if (currency) {
      try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100);
      } catch (err) {
        console.info("account.purchase.amount_format_failed", { amount, currency, error: err });
      }
    } else {
      console.info("account.purchase.currency_missing", { amount });
    }
    return amount.toLocaleString();
  };
  const formatCount = (value?: number | null) => {
    if (value === undefined || value === null) return "";
    return value.toLocaleString();
  };
  const formatCreditsValue = (value?: number | null) => {
    if (value === undefined || value === null) return EXTERNAL_DATA_UNAVAILABLE;
    return value.toLocaleString();
  };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileDraft, setProfileDraft] = useState<{ email?: string; display_name?: string; avatar_url?: string }>({});
  const [avatarUrl, setAvatarUrl] = useState<string>("/profile-image.png");
  const [credits, setCredits] = useState<Credits | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const { session, loading: authLoading, supabase } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setCredits(null);
      setError(null);
      setPasswordError(null);
      setPasswordSuccess(null);
      setCurrentPassword("");
      setNewPassword("");
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [p, c, purchaseData] = await Promise.all([
          apiClient.getProfile(),
          apiClient.getCredits(),
          apiClient.getPurchases(),
        ]);
        setProfile(p);
        setAvatarUrl(resolveAvatar(p.avatar_url));
        setProfileDraft({ email: p.email ?? "", display_name: p.display_name ?? "", avatar_url: p.avatar_url });
        setCredits(c);
        setPurchases(purchaseData.items ?? []);
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
    setPasswordSaving(true);
    setError(null);
    setPasswordError(null);
    setPasswordSuccess(null);
    const currentEmail = (session?.user?.email ?? profile.email ?? "").trim();
    const nextEmail = (profileDraft.email ?? "").trim();
    const hasEmailInput = nextEmail.length > 0;
    const emailChanged = hasEmailInput && currentEmail.length > 0 && nextEmail !== currentEmail;
    const passwordChanged = newPassword.trim().length > 0;
    const needsReauth = emailChanged || passwordChanged;
    try {
      if (hasEmailInput && !currentEmail) {
        setPasswordError("Current email is unavailable. Please sign in again.");
        return;
      }
      if (needsReauth) {
        if (!currentPassword) {
          setPasswordError("Enter your current password to update email or password.");
          return;
        }
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: currentEmail,
          password: currentPassword,
        });
        if (reauthError) {
          setPasswordError(reauthError.message || "Current password is incorrect.");
          return;
        }
      }

      if (passwordChanged) {
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) {
          setPasswordError(updateError.message || "Failed to update password.");
          return;
        }
        console.info("account.password.updated");
      }

      if (emailChanged) {
        const { error: emailError } = await supabase.auth.updateUser({ email: nextEmail });
        if (emailError) {
          setPasswordError(emailError.message || "Failed to update email.");
          return;
        }
        console.info("account.email.change_requested");
        setProfileDraft((prev) => ({ ...prev, email: currentEmail }));
      }

      const profilePayload: Partial<Profile> = {
        display_name: profileDraft.display_name ?? "",
        avatar_url: profileDraft.avatar_url,
      };
      if (!emailChanged && nextEmail.length > 0) {
        profilePayload.email = nextEmail;
      }
      const updated = await apiClient.updateProfile(profilePayload);
      setProfile(updated);
      setAvatarUrl(resolveAvatar(updated.avatar_url));
      setProfileDraft({
        email: updated.email ?? "",
        display_name: updated.display_name ?? "",
        avatar_url: updated.avatar_url,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profile:updated", { detail: updated }));
      }
      console.info("account.profile.updated");

      if (emailChanged && passwordChanged) {
        setPasswordSuccess(`Password updated. Verify ${nextEmail} and relogin to complete the email change.`);
      } else if (emailChanged) {
        setPasswordSuccess(`Verification sent to ${nextEmail}. Please confirm it and relogin.`);
      } else if (passwordChanged) {
        setPasswordSuccess("Password updated successfully.");
      } else {
        setPasswordSuccess("Profile updated successfully.");
      }
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Update failed";
      setError(message);
    } finally {
      setSaving(false);
      setPasswordSaving(false);
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
                <Image src={avatarUrl || "/profile-image.png"} alt="Profile" fill className="object-cover" sizes="64px" />
              </div>
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-sky-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                onClick={() => fileInputRef.current?.click()}
              >
                Edit Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  try {
                  const updated = await apiClient.uploadAvatar(file);
                  setProfile(updated);
                  setAvatarUrl(resolveAvatar(updated.avatar_url));
                  setProfileDraft({
                    email: updated.email ?? "",
                    display_name: updated.display_name ?? "",
                    avatar_url: updated.avatar_url,
                  });
                  setPasswordSuccess("Photo updated successfully.");
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("profile:updated", { detail: updated }));
                  }
                } catch (err) {
                  const message = err instanceof ApiError ? err.message : "Failed to update photo.";
                  setPasswordError(message);
                }
              }}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Display Name</label>
              <input
                value={profileDraft.display_name ?? ""}
                onChange={(event) => setProfileDraft((prev) => ({ ...prev, display_name: event.target.value }))}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Email</label>
              <input
                value={profileDraft.email ?? ""}
                onChange={(event) => setProfileDraft((prev) => ({ ...prev, email: event.target.value }))}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-inner outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--ring)]"
              />
            </div>
          </div>
          {error ? (
            <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</div>
          ) : null}
          {passwordError ? (
            <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{passwordError}</div>
          ) : null}
          {passwordSuccess ? (
            <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{passwordSuccess}</div>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleUpdate}
              disabled={saving || passwordSaving || loading}
              className="w-40 cursor-pointer rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {saving || passwordSaving ? "Updating..." : "Update"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-200">
          <h3 className="text-sm font-extrabold text-slate-800">Purchase History</h3>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-5 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-slate-700 md:text-sm">
              <span>Date</span>
              <span>Checkout Email</span>
              <span>Purchase Amount</span>
              <span>Credits Bought</span>
              <span className="text-right">Invoice</span>
            </div>
            <div className="divide-y divide-slate-100">
              {purchases.length === 0 ? (
                <div className="px-4 py-4 text-sm font-semibold text-slate-600">No purchases yet.</div>
              ) : (
                purchases.map((row) => (
                  <div
                    key={row.transaction_id}
                    className="grid grid-cols-5 items-center px-4 py-4 text-sm font-semibold text-slate-800"
                  >
                    <span className="text-slate-700">{formatDate(row.purchased_at || row.created_at)}</span>
                    <span className="text-slate-700">{row.checkout_email || ""}</span>
                    <span className="text-slate-700">{formatAmount(row.amount, row.currency)}</span>
                    <span className="text-slate-700">{formatCount(row.credits_granted)}</span>
                    <span className="text-right text-slate-700">{row.invoice_number || row.invoice_id || ""}</span>
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
                {formatCreditsValue(credits?.credits_remaining)}
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
