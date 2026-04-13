import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Network,
  CalendarDays,
  BarChart2,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Settings,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { useCohortStore } from "@/store/cohort";
import { authApi } from "@/api/auth";
import { cohortsApi } from "@/api/cohorts";
import type { Cohort } from "@/types";
import { MestChat } from "@/components/chat/MestChat";
import { NotificationBell } from "@/components/NotificationBell";
import { AvatarWithFallback } from "@/components/ui/Avatar";

const TEAL = "#0d968b";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", toCohort: true },
  { icon: Users, label: "Trainees", to: "/trainees" },
  { icon: Network, label: "Teams", to: "/teams" },
  { icon: CalendarDays, label: "Events", to: "/events" },
  { icon: BarChart2, label: "Analytics", toAnalytics: true },
  { icon: Sparkles, label: "AI Manager", toProgrammeManager: true },
];

export function AppLayout() {
  const { admin, clearAuth } = useAuthStore();

  const roleLabel =
    admin?.role === 'super_admin' ? 'Super Admin'
    : admin?.role === 'mentor'    ? 'Mentor'
    : 'Program Admin';
  const { activeCohortId, setActiveCohort, clearActiveCohort } =
    useCohortStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: cohortsRes } = useQuery({
    queryKey: ["cohorts"],
    queryFn: () => cohortsApi.list({ limit: 50 }),
  });
  const cohorts: Cohort[] =
    (cohortsRes?.data as { data?: Cohort[] })?.data ?? [];

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      clearActiveCohort();
      navigate("/login");
    }
  };

  const initials = admin
    ? `${admin.firstName[0]}${admin.lastName[0]}`.toUpperCase()
    : "?";

  const SidebarContent = () => (
    <>
      <div className="p-6">
        <div className="mb-8">
          <img
            src="/logo.png"
            alt="MEST"
            className="h-5 w-auto object-contain"
          />
        </div>

        <nav className="space-y-1">
          {navItems.map(
            ({ icon: Icon, label, to, toCohort, toAnalytics, toProgrammeManager }: any) => {
              const href = toCohort
                ? activeCohortId
                  ? `/cohorts/${activeCohortId}`
                  : "/select-cohort"
                : toAnalytics
                  ? activeCohortId
                    ? `/cohorts/${activeCohortId}/analytics`
                    : "/analytics"
                  : toProgrammeManager
                    ? activeCohortId
                      ? `/cohorts/${activeCohortId}/programme-manager`
                      : "/select-cohort"
                    : to!;

              return (
                <NavLink
                  key={label}
                  to={href}
                  end={toCohort}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#0d968b]/10 text-[#0d968b]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    ].join(" ")
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {label}
                </NavLink>
              );
            },
          )}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-200 p-4">
        <NavLink to="/settings" onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 mb-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-[#0d968b]/10 text-[#0d968b]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: TEAL }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 leading-none">
              {admin?.firstName} {admin?.lastName}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{roleLabel}</p>
          </div>
          <Settings className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background-light">
      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:bg-slate-100"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger – mobile only */}
            <button
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative flex items-center">
              <select
                value={activeCohortId ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) {
                    setActiveCohort(id);
                    navigate(`/cohorts/${id}`);
                  }
                }}
                className="appearance-none rounded-lg border-none bg-slate-100 py-2 pl-3 pr-8 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#0d968b]/20 sm:pl-4"
              >
                {!activeCohortId && <option value="">Select cohort</option>}
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell cohortId={activeCohortId ?? undefined} />

            <div className="mx-1 h-8 w-px bg-slate-200" />

            <NavLink to="/settings" className="flex items-center gap-3 rounded-lg p-1 hover:bg-slate-100 transition-colors">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold leading-none text-slate-900">
                  {admin?.firstName} {admin?.lastName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{roleLabel}</p>
              </div>
              <AvatarWithFallback
                src={admin?.photo ?? null}
                name={`${admin?.firstName} ${admin?.lastName}`}
                size="sm"
              />
            </NavLink>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <MestChat context={{ cohortId: activeCohortId ?? undefined }} />
    </div>
  );
}
