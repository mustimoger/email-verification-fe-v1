"use client";

import Image from "next/image";
import type { ComponentType, SVGProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Code2,
  Leaf,
  LineChart,
  PieChart,
  LayoutDashboard,
  LogOut,
  Menu,
  MoonStar,
  ShieldCheck,
  Puzzle,
  TrendingDown,
  TrendingUp,
  ShoppingBag,
  UserCog,
  User,
} from "lucide-react";
import {
  Cell,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const profile = {
  name: "Moni Roy",
  role: "Admin",
  avatar: "/avatar-default.svg",
  notifications: 6,
};

type Stat = {
  title: string;
  value: string;
  delta: string;
  deltaText: string;
  trend: "up" | "down";
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type ValidationSlice = {
  name: string;
  value: number;
  color: string;
};

type UsagePoint = {
  year: string;
  lineA: number;
  lineB: number;
};

type Task = {
  id: string;
  name: string;
  emails: number;
  date: string;
  valid: number;
  invalid: number;
  status: "Completed" | "Running" | "Cancelled";
};

const stats: Stat[] = [
  {
    title: "Credits Remaining",
    value: "40,689",
    delta: "8.5%",
    deltaText: "Up from yesterday",
    trend: "up",
    icon: ShieldCheck,
  },
  {
    title: "Total Verifications",
    value: "10,293",
    delta: "1.3%",
    deltaText: "Up from past week",
    trend: "up",
    icon: CheckCircle2,
  },
  {
    title: "Total Invalid",
    value: "$89,000",
    delta: "4.3%",
    deltaText: "Down from yesterday",
    trend: "down",
    icon: CircleDollarSign,
  },
  {
    title: "Total Catch-all",
    value: "2040",
    delta: "1.8%",
    deltaText: "Up from yesterday",
    trend: "up",
    icon: Leaf,
  },
];

const validationData: ValidationSlice[] = [
  { name: "Valid", value: 45, color: "#0eb38b" },
  { name: "Catch-all", value: 25, color: "#f6c34d" },
  { name: "Invalid", value: 20, color: "#ff6b6b" },
  { name: "Unknown", value: 10, color: "#3a8dff" },
];

const usageData: UsagePoint[] = [
  { year: "2015", lineA: 28, lineB: 25 },
  { year: "2016", lineA: 40, lineB: 35 },
  { year: "2017", lineA: 45, lineB: 50 },
  { year: "2018", lineA: 52, lineB: 60 },
  { year: "2019", lineA: 95, lineB: 88 },
];

const tasks: Task[] = [
  {
    id: "task-1",
    name: "task_name_1",
    emails: 110451,
    date: "12.09.2019 - 12.53 PM",
    valid: 423,
    invalid: 522,
    status: "Completed",
  },
  {
    id: "task-2",
    name: "task_name_2",
    emails: 45258,
    date: "12.09.2019 - 12.53 PM",
    valid: 423,
    invalid: 4780,
    status: "Running",
  },
  {
    id: "task-3",
    name: "task_name_3",
    emails: 89258,
    date: "12.09.2019 - 12.53 PM",
    valid: 423,
    invalid: 34295,
    status: "Cancelled",
  },
];

const statusColor: Record<Task["status"], string> = {
  Completed: "bg-emerald-500",
  Running: "bg-amber-400",
  Cancelled: "bg-rose-500",
};

type ProfileMenuItem = {
  key: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const profileMenu: ProfileMenuItem[] = [
  { key: "account", label: "Manage Account", icon: UserCog },
  { key: "dark-mode", label: "Dark Mode", icon: MoonStar },
  { key: "logout", label: "Log out", icon: LogOut },
];

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
      onClick={() => {
        if (item.available) onSelect(item.key);
      }}
      className={[
        "group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
        active
          ? "bg-[#4c61cc] text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          : "text-white hover:bg-[#4c61cc]/70 hover:text-white",
        isDisabled && "!cursor-not-allowed",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
      aria-disabled={isDisabled}
      title={isDisabled ? "Coming soon" : undefined}
    >
      <Icon
        className={`h-5 w-5 ${
          active ? "text-white" : "text-white group-hover:text-white"
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  const handleSelect = (key: string) => {
    setActive(key);
    setIsNavOpen(false);
  };

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
              <div className="relative h-24 w-[440px] overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="BoltRoute logo"
                  fill
                  className="object-contain"
                  sizes="440px"
                />
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
            <NavButton
              item={{ key: "logout", label: "Logout", icon: LogOut, available: false }}
              active={active === "logout"}
              onSelect={handleSelect}
            />
          </nav>
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
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-md bg-transparent px-2 py-1 transition hover:bg-white/40"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
              >
                <Avatar />
                <p className="text-sm font-semibold text-slate-900">
                  {profile.name}
                </p>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>

              {profileMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-100 bg-white py-2 shadow-2xl ring-1 ring-slate-100"
                >
                  {profileMenu.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-[#4c61cc] shadow-inner">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-transparent px-4 py-6 sm:px-6 lg:px-10">
          <section className="mt-4 grid gap-4 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const trendUp = stat.trend === "up";
              const trendColor = trendUp ? "text-emerald-600" : "text-rose-500";
              const trendIcon = trendUp ? TrendingUp : TrendingDown;
              const TrendIcon = trendIcon;
              return (
                <div
                  key={stat.title}
                  className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-600">
                        {stat.title}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        {stat.value}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-[#4c61cc] shadow-inner">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
                    <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                    <span className={trendColor}>{stat.delta}</span>
                    <span className="text-slate-600 font-medium">
                      {stat.deltaText}
                    </span>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900">Validation</p>
                <PieChart className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-4 h-[260px] w-full">
                <ResponsiveContainer>
                  <RePieChart>
                    <Pie
                      data={validationData}
                      dataKey="value"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      startAngle={90}
                      endAngle={450}
                    >
                      {validationData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900">Credit Usage</p>
                <LineChart className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-4 h-[260px] w-full">
                <ResponsiveContainer>
                  <ReLineChart data={usageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="year" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}`}
                      width={30}
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
                      dataKey="lineA"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "white" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="lineB"
                      stroke="#0eb38b"
                      strokeWidth={3}
                      dot={{ r: 5, fill: "#0eb38b", strokeWidth: 2, stroke: "white" }}
                    />
                  </ReLineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900">Current Plan</p>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-[#4c61cc] shadow-inner">
                  <LineChart className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-6 text-2xl font-extrabold text-amber-500">
                Enterprise
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-semibold">Purchase Date</span>
              </div>
              <p className="mt-3 text-xl font-bold text-slate-900">28.12.2025</p>
              <p className="text-sm text-slate-600">Purchase Date</p>
            </div>
          </section>

          <section className="mt-5 rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Verification Tasks
              </h2>
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-600">
                  Month
                </label>
                <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#4c61cc] focus:outline-none">
                  <option>October</option>
                  <option>September</option>
                  <option>August</option>
                </select>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
              <div className="grid grid-cols-6 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                <span>Task Name</span>
                <span>Number Of Emails</span>
                <span>Date - Time</span>
                <span className="text-right">Valid</span>
                <span className="text-right">Invalid</span>
                <span className="text-right">Status</span>
              </div>
              <div className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="grid grid-cols-6 items-center px-4 py-4 text-sm text-slate-800"
                  >
                    <span className="font-semibold text-slate-700">
                      {task.name}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {task.emails.toLocaleString()}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {task.date}
                    </span>
                    <span className="text-right font-semibold text-slate-700">
                      {task.valid.toLocaleString()}
                    </span>
                    <span className="text-right font-semibold text-slate-700">
                      {task.invalid.toLocaleString()}
                    </span>
                    <span className="flex justify-end">
                      <span
                        className={[
                          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold text-white shadow-sm",
                          statusColor[task.status],
                        ].join(" ")}
                      >
                        <span className="inline-block h-2 w-2 rounded-full bg-white/80" />
                        {task.status}
                        <ChevronRight className="h-4 w-4 text-white/80" />
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
