"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
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
  Menu,
  MoonStar,
  PieChart,
  LogOut,
  ShieldCheck,
  Puzzle,
  TrendingDown,
  TrendingUp,
  Settings,
  ShoppingBag,
  User,
  UserCog,
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
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  available: boolean;
};

type Stat = {
  title: string;
  value: string;
  delta: string;
  deltaText: string;
  trend: "up" | "down";
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
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

const primaryNav: NavItem[] = [
  { key: "overview", label: "Overview", icon: CheckCircle2, available: true },
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

const profileMenu = [
  { key: "account", label: "Manage Account", icon: UserCog },
  { key: "dark-mode", label: "Dark Mode", icon: MoonStar },
  { key: "logout", label: "Log out", icon: LogOut },
];

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

const statusVariant: Record<Task["status"], "success" | "warning" | "destructive"> =
  {
    Completed: "success",
    Running: "warning",
    Cancelled: "destructive",
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
    <Button
      variant={active ? "default" : "ghost"}
      className={cn(
        "w-full justify-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-none",
        active
          ? "bg-[#4c61cc] text-white"
          : "text-white/80 hover:bg-[#4c61cc]/70 hover:text-white",
        isDisabled && "!cursor-not-allowed opacity-70 hover:bg-transparent",
      )}
      onClick={() => onSelect(item.key)}
      aria-current={active ? "page" : undefined}
      aria-disabled={isDisabled}
      disabled={isDisabled}
    >
      <Icon className="h-5 w-5" />
      {item.label}
    </Button>
  );
}

function AvatarBadge() {
  const initials = useMemo(() => {
    if (!profile.name) return "U";
    const parts = profile.name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts[1]?.[0] ?? "";
    return (first + last || first).toUpperCase();
  }, []);

  return (
    <Avatar className="border border-slate-100 shadow-inner">
      <AvatarImage src={profile.avatar} alt={profile.name} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
  const trendColor =
    stat.trend === "up" ? "text-emerald-600" : "text-rose-500";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <p className="text-sm font-semibold text-slate-600">{stat.title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-[#4c61cc] shadow-inner">
          <Icon className="h-6 w-6" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <TrendIcon className={cn("h-4 w-4", trendColor)} />
          <span className={trendColor}>{stat.delta}</span>
          <span className="text-slate-600 font-medium">{stat.deltaText}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewShadcnPage() {
  const [active, setActive] = useState<string>("overview");

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 z-30 w-64 bg-[#2f47c7] text-white shadow-xl lg:static">
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
            <Button
              size="icon"
              variant="ghost"
              className="text-white/80 hover:bg-white/10 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <nav className="mt-8 space-y-2">
            {primaryNav.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                active={active === item.key}
                onSelect={setActive}
              />
            ))}
          </nav>

          <div className="mt-auto space-y-2 pt-10">
            {secondaryNav.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                active={active === item.key}
                onSelect={setActive}
              />
            ))}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur md:px-6">
          <div className="ml-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full text-slate-600 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {profile.notifications > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {profile.notifications}
                </span>
              ) : null}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-3 rounded-full border border-slate-100 bg-white px-2 py-1 shadow-sm"
                >
                  <AvatarBadge />
                  <div className="leading-tight text-left">
                    <p className="text-sm font-semibold text-slate-900">
                      {profile.name}
                    </p>
                    <p className="text-xs text-slate-500">{profile.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {profileMenu.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.key} className="gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-[#4c61cc] shadow-inner">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-transparent px-4 py-6 sm:px-6 lg:px-10">
          <Card className="bg-white/70 backdrop-blur">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-3xl">Dashboard</CardTitle>
                  <p className="text-sm text-slate-600">
                    Overview of verification usage, credits, and performance.
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.title} stat={stat} />
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Validation</CardTitle>
                <PieChart className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Credit Usage</CardTitle>
                <LineChart className="h-5 w-5 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer>
                    <ReLineChart
                      data={usageData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
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
                        dot={{
                          r: 5,
                          fill: "#3b82f6",
                          strokeWidth: 2,
                          stroke: "white",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="lineB"
                        stroke="#0eb38b"
                        strokeWidth={3}
                        dot={{
                          r: 5,
                          fill: "#0eb38b",
                          strokeWidth: 2,
                          stroke: "white",
                        }}
                      />
                    </ReLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Current Plan</CardTitle>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-[#4c61cc] shadow-inner">
                  <LineChart className="h-6 w-6" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-amber-500">
                  Enterprise
                </div>
                <Badge variant="success" className="mt-6 inline-flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Purchase Date
                </Badge>
                <p className="mt-3 text-xl font-bold text-slate-900">28.12.2025</p>
                <p className="text-sm text-slate-600">Purchase Date</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-5">
            <CardHeader className="flex flex-col gap-3 pb-2 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-xl">Verification Tasks</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 rounded-lg border-slate-200"
                  >
                    October
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {["October", "September", "August"].map((month) => (
                    <DropdownMenuItem key={month}>{month}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="pt-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Task Name</TableHead>
                    <TableHead>Number Of Emails</TableHead>
                    <TableHead>Date - Time</TableHead>
                    <TableHead className="text-right">Valid</TableHead>
                    <TableHead className="text-right">Invalid</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-semibold text-slate-700">
                        {task.name}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">
                        {task.emails.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">
                        {task.date}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-700">
                        {task.valid.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-700">
                        {task.invalid.toLocaleString()}
                      </TableCell>
                      <TableCell className="flex justify-end">
                        <Badge variant={statusVariant[task.status]}>
                          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-current opacity-80" />
                          {task.status}
                          <ChevronRight className="ml-2 h-4 w-4 text-current/70" />
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
