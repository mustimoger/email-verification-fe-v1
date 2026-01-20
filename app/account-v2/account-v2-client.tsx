"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardShell } from "../components/dashboard-shell";
import { RequireAuth } from "../components/protected";
import { useAuth } from "../components/auth-provider";
import { apiClient, ApiError, Credits, Profile, Purchase } from "../lib/api-client";
import { EXTERNAL_DATA_UNAVAILABLE } from "../lib/messages";
import { AccountHero, AccountSectionCard } from "./account-v2-sections";
import styles from "./account-v2.module.css";

type PurchaseRow = {
  id: string;
  date: string;
  checkoutEmail: string;
  amount: string;
  credits: string;
  invoice: string;
};

export default function AccountV2Client() {
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
  const [isLoaded, setIsLoaded] = useState(false);
  const { session, loading: authLoading, supabase } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

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

  const handleAvatarUpload = async (file: File) => {
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
  };

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

  const purchaseRows = useMemo<PurchaseRow[]>(
    () =>
      purchases.map((row) => ({
        id: row.transaction_id,
        date: formatDate(row.purchased_at || row.created_at),
        checkoutEmail: row.checkout_email || "",
        amount: formatAmount(row.amount, row.currency),
        credits: formatCount(row.credits_granted),
        invoice: row.invoice_number || row.invoice_id || "",
      })),
    [purchases],
  );

  const transitionClass = isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6";
  const isUpdating = saving || passwordSaving || loading;

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
        <section className={`${styles.root} relative flex flex-col gap-8 pb-10 lg:px-8`}>
          <AccountHero transitionClass={transitionClass} />

          <AccountSectionCard
            id="account-profile"
            className="scroll-mt-24"
            transitionClass={transitionClass}
            delay="0.05s"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Profile</p>
                <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
                  Profile and security
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Keep your contact details up to date and refresh credentials when needed.
                </p>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-[var(--account-border)] bg-white/70 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Status
                </span>
                <span>{profile?.email ? "Verified account" : "Account pending"}</span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[var(--account-border)] bg-white/70">
                  <Image src={avatarUrl || "/profile-image.png"} alt="Profile" fill className="object-cover" sizes="80px" />
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--account-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Edit photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleAvatarUpload(file);
                  }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Display name
                  </label>
                  <input
                    value={profileDraft.display_name ?? ""}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, display_name: event.target.value }))}
                    className="rounded-xl border border-[var(--account-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm outline-none focus:border-[var(--account-accent)] focus:ring-1 focus:ring-[var(--ring)]"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Email
                  </label>
                  <input
                    value={profileDraft.email ?? ""}
                    onChange={(event) => setProfileDraft((prev) => ({ ...prev, email: event.target.value }))}
                    className="rounded-xl border border-[var(--account-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm outline-none focus:border-[var(--account-accent)] focus:ring-1 focus:ring-[var(--ring)]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="rounded-xl border border-[var(--account-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm outline-none focus:border-[var(--account-accent)] focus:ring-1 focus:ring-[var(--ring)]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="rounded-xl border border-[var(--account-border)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-sm outline-none focus:border-[var(--account-accent)] focus:ring-1 focus:ring-[var(--ring)]"
                />
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-[var(--account-border)] bg-[var(--status-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--status-danger)]">
                {error}
              </div>
            ) : null}
            {passwordError ? (
              <div className="mt-3 rounded-xl border border-[var(--account-border)] bg-[var(--status-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--status-danger)]">
                {passwordError}
              </div>
            ) : null}
            {passwordSuccess ? (
              <div className="mt-3 rounded-xl border border-[var(--account-border)] bg-[var(--status-success-soft)] px-4 py-3 text-sm font-semibold text-[var(--status-success)]">
                {passwordSuccess}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="rounded-xl bg-[linear-gradient(135deg,var(--account-accent)_0%,var(--account-accent-strong)_100%)] px-6 py-3 text-sm font-semibold text-[var(--account-cta-ink)] shadow-[0_16px_32px_rgba(249,168,37,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isUpdating ? "Updating..." : "Update profile"}
              </button>
              <button
                type="button"
                className="rounded-xl border border-[var(--account-border)] bg-white/70 px-6 py-3 text-sm font-semibold text-[var(--text-secondary)]"
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
              >
                Clear passwords
              </button>
            </div>
          </AccountSectionCard>

          <div
            className={`grid gap-6 lg:grid-cols-[1.4fr_0.9fr] ${transitionClass ?? ""}`}
            style={{ transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s" }}
          >
            <AccountSectionCard>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Billing
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Purchase history</h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Review recent purchases and match invoices to your finance records.
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--account-accent-soft)] text-[var(--account-accent)]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 7h12M6 12h12M6 17h12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--account-border)] bg-white/70">
                <div className="hidden grid-cols-5 gap-3 bg-white/70 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] md:grid">
                  <span>Date</span>
                  <span>Checkout email</span>
                  <span>Purchase amount</span>
                  <span>Credits bought</span>
                  <span className="text-right">Invoice</span>
                </div>
                <div className="hidden divide-y divide-[var(--account-border)] md:block">
                  {purchaseRows.length === 0 ? (
                    <div className="px-5 py-4 text-sm font-semibold text-[var(--text-secondary)]">
                      No purchases yet.
                    </div>
                  ) : (
                    purchaseRows.map((row) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-5 items-center gap-3 px-5 py-4 text-sm font-semibold text-[var(--text-primary)]"
                      >
                        <span className="text-[var(--text-secondary)]">{row.date}</span>
                        <span className="text-[var(--text-secondary)]">{row.checkoutEmail}</span>
                        <span className="text-[var(--text-secondary)]">{row.amount}</span>
                        <span className="text-[var(--text-secondary)]">{row.credits}</span>
                        <span className="text-right text-[var(--text-secondary)]">{row.invoice}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="divide-y divide-[var(--account-border)] md:hidden">
                  {purchaseRows.length === 0 ? (
                    <div className="px-5 py-4 text-sm font-semibold text-[var(--text-secondary)]">
                      No purchases yet.
                    </div>
                  ) : (
                    purchaseRows.map((row) => (
                      <div key={row.id} className="px-5 py-4 text-sm font-semibold text-[var(--text-primary)]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            Date
                          </span>
                          <span className="text-[var(--text-secondary)]">{row.date}</span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {[
                            { label: "Checkout email", value: row.checkoutEmail },
                            { label: "Purchase amount", value: row.amount },
                            { label: "Credits bought", value: row.credits },
                            { label: "Invoice", value: row.invoice },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between">
                              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                {item.label}
                              </span>
                              <span className="text-[var(--text-secondary)]">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {loading ? (
                <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">Loading purchases...</p>
              ) : null}
            </AccountSectionCard>

            <AccountSectionCard>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Credits
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Credits overview</h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Track remaining credits and stay ready for upcoming verification runs.
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--account-accent-soft)] text-[var(--account-accent)]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                    <path
                      d="M4 7h16M4 12h16M4 17h10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-[var(--account-border)] bg-white/70 px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                  Total credits remaining
                </p>
                <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">
                  {formatCreditsValue(credits?.credits_remaining)}
                </p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Credits never expire and apply to every verification method.
                </p>
              </div>
              {loading ? (
                <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">Loading credits...</p>
              ) : null}
            </AccountSectionCard>
          </div>
        </section>
      </RequireAuth>
    </DashboardShell>
  );
}
