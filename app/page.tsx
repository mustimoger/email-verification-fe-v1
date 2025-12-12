"use client";

import Image from "next/image";
import type { ComponentType, SVGProps } from "react";
import { useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Code2,
  LayoutDashboard,
  LogOut,
  Menu,
  Puzzle,
  Settings,
  ShoppingBag,
  User,
} from "lucide-react";

type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  available: boolean;
};

const primaryNav: NavItem[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, available: true },
  { key: "verify", label: "Verify", icon: CheckCircle2, available: false },
  { key: "history", label: "History", icon: Clock3, available: false },
  { key: "integrations", label: "Integrations", icon: Puzzle, available: false },
  { key: "api", label: "API", icon: Code2, available: false },
  { key: "pricing", label: "Pricing", icon: ShoppingBag, available: false },
  { key: "account", label: "Account", icon: User, available: false },
];

const secondaryNav: NavItem[] = [
  { key: "settings", label: "Settings", icon: Settings, available: false },
  { key: "logout", label: "Logout", icon: LogOut, available: false },
];

const profile = {
  name: "Moni Roy",
  role: "Admin",
  avatar: "/avatar-default.svg",
  notifications: 6,
};

function NavButton({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  onSelect: (key: string) => void;
}) {
  const Icon = item.icon;
  const isDisabled = !item.available;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      disabled={isDisabled}
      className={[
        "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
        active
          ? "bg-[#4c61cc] text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          : "text-white/80 hover:bg-[#4c61cc]/70 hover:text-white",
        isDisabled && "!cursor-not-allowed opacity-70 hover:bg-transparent",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
      aria-disabled={isDisabled}
      title={isDisabled ? "Coming soon" : undefined}
    >
      <Icon
        className={`h-5 w-5 ${
          active ? "text-white" : "text-white/90 group-hover:text-white"
        }`}
      />
      <span>{item.label}</span>
    </button>
  );
}

function Avatar() {
  const initials = useMemo(() => {
    if (!profile.name) return "U";
    const parts = profile.name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts[1]?.[0] ?? "";
    return (first + last || first).toUpperCase();
  }, []);

  return (
    <div className="relative h-11 w-11 overflow-hidden rounded-full bg-gradient-to-br from-[#6ea8ff] via-[#f089ff] to-[#ffba7a] text-white">
      <Image
        src={profile.avatar}
        alt={profile.name}
        fill
        className="object-cover"
        sizes="44px"
        onError={(event) => {
          const target = event.target as HTMLImageElement;
          target.style.display = "none";
        }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
        {initials}
      </span>
    </div>
  );
}

export default function Home() {
  const [active, setActive] = useState<string>("overview");
  const [isNavOpen, setIsNavOpen] = useState(false);

  const handleSelect = (key: string) => {
    setActive(key);
    setIsNavOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 z-30 w-64 bg-[#2f47c7] text-white shadow-xl transition-transform duration-200 lg:static lg:translate-x-0",
          isNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
        aria-label="Primary"
      >
        <div className="flex h-full flex-col px-5 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg font-extrabold">
                D
              </div>
              <div className="text-lg font-extrabold">
                Dash<span className="text-slate-100">Stack</span>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 lg:hidden"
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
                active={active === item.key}
                onSelect={handleSelect}
              />
            ))}
          </nav>

          <div className="mt-auto space-y-2 pt-10">
            {secondaryNav.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                active={active === item.key}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile scrim */}
      {isNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setIsNavOpen(false)}
        />
      ) : null}

      {/* Content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur md:px-6">
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
              className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {profile.notifications > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {profile.notifications}
                </span>
              ) : null}
            </button>
            <div className="flex items-center gap-3 rounded-full border border-slate-100 bg-white px-2 py-1 shadow-sm">
              <Avatar />
              <div className="leading-tight">
                <p className="text-sm font-semibold text-slate-900">
                  {profile.name}
                </p>
                <p className="text-xs text-slate-500">{profile.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-transparent px-4 py-6 sm:px-6 lg:px-10">
          <section className="rounded-2xl bg-white/70 p-6 shadow-md ring-1 ring-slate-100 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-600">
                  Overview of verification usage, credits, and performance.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
