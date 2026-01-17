"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Code2,
  LayoutDashboard,
  LogOut,
  Menu,
  MoonStar,
  Puzzle,
  ShoppingBag,
  User,
  UserCog,
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
  { key: "account", label: "Manage Account", icon: UserCog },
  { key: "logout", label: "Log out", icon: LogOut },
];

function Avatar({ name, src }: { name: string; src?: string }) {
  const initials = useMemo(() => {
    if (!name) return "U";
    const parts = name.trim().split(" ").filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts[1]?.[0] ?? "";
    return (first + last || first).toUpperCase();
  }, []);

  const [showFallback, setShowFallback] = useState(false);

  return (
    <div className="relative h-11 w-11 overflow-hidden rounded-full bg-gradient-to-br from-[var(--avatar-start)] via-[var(--avatar-mid)] to-[var(--avatar-end)] text-[var(--text-inverse)]">
      <Image
        src={src || "/profile-image.png"}
        alt={name}
        fill
        className="object-cover"
        sizes="44px"
        onLoad={() => setShowFallback(false)}
        onError={() => setShowFallback(true)}
        style={showFallback ? { display: "none" } : undefined}
      />
      {showFallback ? (
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
          {initials}
        </span>
      ) : null}
    </div>
  );
}

function NavButton({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = item.icon;
  const baseClasses =
    "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition";
  const activeClasses = active
    ? "bg-[var(--nav-active)] text-[var(--text-inverse)] shadow-[var(--nav-shadow)]"
    : "text-[var(--text-inverse)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-inverse)]";

  if (!item.available) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClasses} ${activeClasses} cursor-not-allowed`}
        aria-disabled
        title="Coming soon"
      >
        <Icon className="h-5 w-5" />
        <span>{item.label}</span>
      </button>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className={`${baseClasses} ${activeClasses}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-5 w-5" />
      <span>{item.label}</span>
    </Link>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, session, loading, supabase } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileName, setProfileName] = useState("Moni Roy");
  const [profileRole, setProfileRole] = useState("");
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(undefined);
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
      if (!session) return;
      try {
        const profile = await apiClient.getProfile();
        const name = profile.display_name?.trim() || profile.email?.split("@")[0] || "User";
        setProfileName(name);
        // Do not surface auth roles; leave blank to keep layout without showing technical values.
        setProfileRole("");
        if (profile.avatar_url) {
          setProfileAvatar(profile.avatar_url);
        }
      } catch (err) {
        console.warn("header.profile_load_failed", err);
      }
    };
    void loadProfile();
  }, [session]);

  useEffect(() => {
    const handleProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Profile>).detail;
      if (!detail) return;
      const name = detail.display_name?.trim() || detail.email?.split("@")[0] || "User";
      setProfileName(name);
      setProfileRole("");
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
          "fixed inset-y-0 z-30 w-64 bg-[var(--nav-surface)] text-[var(--text-inverse)] shadow-xl transition-transform duration-200 lg:static lg:translate-x-0",
          isNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
        aria-label="Primary"
      >
        <div className="flex h-full flex-col px-5 py-6">
        <div className="flex items-center justify-between pl-4">
            <Image
              src="/logo.png"
              alt="BoltRoute"
              width={140}
              height={25}
              priority
            />
            <button
              type="button"
              className="rounded-lg p-2 text-[var(--nav-muted)] hover:bg-[var(--nav-muted-hover)] lg:hidden"
              onClick={() => setIsNavOpen(false)}
              aria-label="Close navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-8 space-y-2">
            {primaryNav.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                active={activeKey === item.key}
                onSelect={() => setIsNavOpen(false)}
              />
            ))}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={[
                "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition cursor-pointer",
                "text-[var(--text-inverse)] hover:bg-[var(--nav-hover)] hover:text-[var(--text-inverse)] disabled:opacity-60 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              <LogOut className="h-5 w-5" />
              <span>{loggingOut ? "Logging out..." : "Logout"}</span>
            </button>
          </nav>
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

          <div className="ml-auto flex items-center gap-4">
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
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-md bg-transparent px-2 py-1 transition hover:bg-[var(--surface-overlay-strong)]"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
              >
                <Avatar name={profileName} src={profileAvatar} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {profileName}
                  </p>
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    {profileRole}
                  </p>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-4 w-4 text-[var(--text-muted)]"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>

              {profileMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] py-2 shadow-2xl ring-1 ring-[var(--border)]"
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
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--accent)] shadow-inner">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          {isLogout && loggingOut ? "Logging out..." : item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
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
