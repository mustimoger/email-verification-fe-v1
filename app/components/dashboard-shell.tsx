"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Code2,
  LayoutDashboard,
  LogOut,
  Menu,
  MoonStar,
  Plus,
  Puzzle,
  ShoppingBag,
  User,
  UserCog,
  X,
} from "lucide-react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "./auth-provider";
import { resolveAuthState } from "./auth-guard-utils";
import { apiClient } from "../lib/api-client";
import type { Profile } from "../lib/api-client";
import { useTheme } from "./theme-provider";

type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
  available: boolean;
};

const primaryNav: NavItem[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    href: "/overview",
    available: true,
  },
  {
    key: "verify",
    label: "Verify",
    icon: CheckCircle2,
    href: "/verify",
    available: true,
  },
  { key: "history", label: "History", icon: Clock3, href: "/history", available: true },
  {
    key: "integrations",
    label: "Integrations",
    icon: Puzzle,
    href: "/integrations",
    available: true,
  },
  { key: "api", label: "API", icon: Code2, href: "/api", available: true },
  { key: "pricing", label: "Pricing", icon: ShoppingBag, href: "/pricing", available: true },
  { key: "account", label: "Account", icon: User, href: "/account", available: true },
];

type ProfileMenuItem = {
  key: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const profileMenu: ProfileMenuItem[] = [
  { key: "account", label: "Account Settings", icon: UserCog },
  { key: "logout", label: "Log out", icon: LogOut },
];

function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string;
  size?: "sm" | "md";
}) {
  const initials = useMemo(() => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts[1]?.[0] ?? "";
    return (first + last || first).toUpperCase();
  }, [name]);

  const [showFallback, setShowFallback] = useState(false);
  const sizeClasses = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const textClasses = size === "sm" ? "text-xs" : "text-sm";
  const imageSize = size === "sm" ? "36px" : "44px";

  return (
    <div
      className={`relative ${sizeClasses} overflow-hidden rounded-full bg-gradient-to-br from-[var(--avatar-start)] via-[var(--avatar-mid)] to-[var(--avatar-end)] text-[var(--text-inverse)]`}
    >
      <Image
        src={src || "/profile-image.png"}
        alt={name}
        fill
        className="object-cover"
        sizes={imageSize}
        onLoad={() => setShowFallback(false)}
        onError={() => setShowFallback(true)}
        style={showFallback ? { display: "none" } : undefined}
      />
      {showFallback ? (
        <span
          className={`absolute inset-0 flex items-center justify-center font-semibold ${textClasses}`}
        >
          {initials}
        </span>
      ) : null}
    </div>
  );
}

function NavButton({
  item,
  active,
  collapsed,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  const baseClasses =
    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200";
  const activeClasses = active
    ? "bg-gradient-to-r from-[var(--sidebar-active-start)] to-[var(--sidebar-active-end)] text-white shadow-[var(--sidebar-active-shadow)]"
    : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text-strong)]";
  const iconClasses = active
    ? "text-white"
    : "text-[var(--sidebar-icon)] group-hover:text-[var(--sidebar-icon-hover)]";

  if (!item.available) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClasses} ${activeClasses} cursor-not-allowed opacity-60`}
        aria-disabled
        title="Coming soon"
      >
        <Icon className={`h-5 w-5 ${iconClasses}`} />
        {!collapsed ? <span>{item.label}</span> : null}
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className={`${baseClasses} ${activeClasses} ${collapsed ? "justify-center" : ""}`}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
    >
      <Icon className={`h-5 w-5 ${iconClasses}`} />
      {!collapsed ? <span>{item.label}</span> : null}
    </Link>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, session, loading } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(undefined);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null | undefined>(undefined);
  const authState = resolveAuthState({ loading, hasSession: Boolean(session) });

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("dashboard.sidebar.collapsed");
      if (stored === "true") {
        setIsCollapsed(true);
      }
    } catch (err) {
      console.warn("sidebar.collapse_state_load_failed", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("dashboard.sidebar.collapsed", String(isCollapsed));
    } catch (err) {
      console.warn("sidebar.collapse_state_save_failed", err);
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (!isCollapsed) return;
    setProfileMenuOpen(false);
  }, [isCollapsed]);

  const activeKey =
    primaryNav.find((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname?.startsWith(item.href),
    )?.key ?? "overview";

  useEffect(() => {
    if (authState === "unauthenticated") {
      console.info("auth.redirect_dashboard_shell", { redirectTo: "/signin", pathname });
      router.replace("/signin");
    }
  }, [authState, pathname, router]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!session) {
        setProfileName("");
        setProfileEmail("");
        setProfileAvatar(undefined);
        setCreditsRemaining(undefined);
        return;
      }
      const fallbackEmail = session.user?.email ?? "";
      const fallbackName = fallbackEmail ? fallbackEmail.split("@")[0] : "";
      if (fallbackEmail) {
        setProfileEmail(fallbackEmail);
      }
      if (fallbackName) {
        setProfileName(fallbackName);
      }
      const [profileResult, creditsResult] = await Promise.allSettled([
        apiClient.getProfile(),
        apiClient.getCredits(),
      ]);
      if (profileResult.status === "fulfilled") {
        const profile = profileResult.value;
        const name =
          profile.display_name?.trim() ||
          profile.email?.split("@")[0] ||
          fallbackName;
        setProfileName(name);
        setProfileEmail(profile.email ?? fallbackEmail);
        setProfileAvatar(profile.avatar_url || undefined);
      } else {
        console.warn("header.profile_load_failed", profileResult.reason);
      }
      if (creditsResult.status === "fulfilled") {
        const credits = creditsResult.value;
        const remaining =
          typeof credits.credits_remaining === "number" ? credits.credits_remaining : null;
        setCreditsRemaining(remaining);
      } else {
        console.warn("header.credits_load_failed", creditsResult.reason);
        setCreditsRemaining(undefined);
      }
    };
    void loadProfile();
  }, [session]);

  useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Profile>).detail;
      if (!detail) return;
      const fallbackEmail = session?.user?.email ?? "";
      const fallbackName = fallbackEmail ? fallbackEmail.split("@")[0] : "";
      const name =
        detail.display_name?.trim() ||
        detail.email?.split("@")[0] ||
        fallbackName;
      setProfileName(name);
      setProfileEmail(detail.email ?? fallbackEmail);
      setProfileAvatar(detail.avatar_url || undefined);
    };
    window.addEventListener("profile:updated", handleProfileUpdated as EventListener);
    return () => window.removeEventListener("profile:updated", handleProfileUpdated as EventListener);
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        console.error("auth.logout_failed", { error });
      }
      setProfileMenuOpen(false);
      setIsNavOpen(false);
      router.push("/signin");
    } finally {
      setLoggingOut(false);
    }
  };

  const displayName =
    profileName || (profileEmail ? profileEmail.split("@")[0] : "");
  const displayEmail = profileEmail;
  const displayLabel = displayName || displayEmail;
  const hasCredits = typeof creditsRemaining === "number";
  const creditsValue =
    typeof creditsRemaining === "number" ? creditsRemaining.toLocaleString() : "";

  if (authState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-700">
        Checking session...
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-30 flex h-screen flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] transition-all duration-300 ease-in-out lg:static",
          "w-[240px]",
          isCollapsed ? "lg:w-[72px]" : "lg:w-[240px]",
          isNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
        aria-label="Primary"
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex h-16 items-center justify-between border-b border-[var(--sidebar-divider)] ${
              isCollapsed ? "px-2" : "px-4"
            }`}
          >
            <Link
              href="/overview"
              aria-label="BoltRoute"
              className="flex items-center gap-2 shrink-0"
            >
              {isCollapsed ? (
                <Image
                  src="/bolt.png"
                  alt="BoltRoute"
                  width={40}
                  height={40}
                  className="h-8 w-8 object-contain"
                  priority
                />
              ) : (
                <Image
                  src="/logo.png"
                  alt="BoltRoute"
                  width={180}
                  height={32}
                  className="h-7 w-auto object-contain"
                  priority
                />
              )}
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg p-2 text-[var(--sidebar-toggle)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-toggle-hover)] lg:hidden"
                onClick={() => setIsNavOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hidden rounded-lg p-2 text-[var(--sidebar-toggle)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-toggle-hover)] lg:flex"
                onClick={() => setIsCollapsed((prev) => !prev)}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {hasCredits && !isCollapsed ? (
            <div className="mx-3 mt-4 rounded-xl border border-[var(--sidebar-credit-border)] bg-[var(--sidebar-credit-surface)] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-credit-label)]">
                    Available Credits
                  </p>
                  <p className="text-xl font-bold text-[var(--sidebar-credit-value)]">
                    {creditsValue}
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--sidebar-credit-action)] text-white transition-colors hover:bg-[var(--sidebar-credit-action-hover)]"
                  aria-label="Add credits"
                >
                  <Plus className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : null}

          <nav className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? "px-2" : "px-3"}`}>
            <ul className="space-y-1">
              {primaryNav.map((item) => (
                <li key={item.key}>
                  <NavButton
                    item={item}
                    active={activeKey === item.key}
                    collapsed={isCollapsed}
                    onSelect={() => {
                      setIsNavOpen(false);
                      setProfileMenuOpen(false);
                    }}
                  />
                </li>
              ))}
            </ul>
          </nav>

          <div
            className={`border-t border-[var(--sidebar-divider)] ${isCollapsed ? "p-2" : "p-3"}`}
            ref={profileRef}
          >
            {isCollapsed ? (
              <button
                type="button"
                title="Logout"
                onClick={handleLogout}
                disabled={loggingOut}
                className={[
                  "flex w-full items-center justify-center rounded-xl p-2.5 transition-all duration-200",
                  "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-logout-hover)] hover:text-[var(--sidebar-logout-text)]",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                <LogOut className="h-5 w-5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-[var(--sidebar-user-hover)]"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                >
                  <Avatar name={displayLabel} src={profileAvatar} size="sm" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-[var(--sidebar-text-strong)]">
                      {displayLabel}
                    </p>
                    {displayEmail ? (
                      <p className="truncate text-xs text-[var(--sidebar-muted)]">
                        {displayEmail}
                      </p>
                    ) : null}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-[var(--sidebar-muted)] transition-transform ${
                      profileMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {profileMenuOpen ? (
                  <div
                    role="menu"
                    className="mt-2 rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] py-1 shadow-xl"
                  >
                    {profileMenu.map((item) => {
                      const Icon = item.icon;
                      const isLogout = item.key === "logout";
                      return (
                        <button
                          key={item.key}
                          type="button"
                          role="menuitem"
                          onClick={
                            isLogout
                              ? handleLogout
                              : () => {
                                  setProfileMenuOpen(false);
                                  if (item.key === "account") {
                                    router.push("/account");
                                  }
                                }
                          }
                          disabled={isLogout && loggingOut}
                          className={[
                            "flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors",
                            isLogout
                              ? "text-[var(--sidebar-logout-text)] hover:bg-[var(--sidebar-logout-hover)]"
                              : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]",
                            "disabled:opacity-60 disabled:cursor-not-allowed",
                          ].join(" ")}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{isLogout && loggingOut ? "Logging out..." : item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </aside>

      {isNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-[var(--overlay)] backdrop-blur-sm lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setIsNavOpen(false)}
        />
      ) : null}

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-[var(--border)] bg-[var(--surface-overlay)] px-4 py-3 backdrop-blur md:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            onClick={() => setIsNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              aria-pressed={resolvedTheme === "dark"}
              aria-label={
                resolvedTheme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              className={[
                "flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] transition",
                resolvedTheme === "dark"
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              <MoonStar className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-transparent px-4 py-6 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-10">
            {children}
            <footer className="mt-auto flex flex-wrap gap-8 text-xs font-semibold text-[var(--text-muted)]">
              <button
                type="button"
                className="hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                Privacy Policy & Terms
              </button>
              <button
                type="button"
                className="hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                Cookie Preferences
              </button>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

export const navConfig = primaryNav;
