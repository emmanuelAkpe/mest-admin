import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, Minus, CalendarDays, Users, Network,
  BarChart2, AlertTriangle, Star, Zap, CheckCircle2, Clock,
} from 'lucide-react'
import { cohortsApi } from '@/api/cohorts'
import { eventsApi } from '@/api/events'
import { useCohortStore } from '@/store/cohort'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Event, DashboardStats } from '@/types'

const TEAL = '#0d968b'

function formatEventDate(d: string) {
  const date = new Date(d)
  return {
    day: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
  }
}

function formatEventType(type: string) {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatTimeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// ── Health badge ──────────────────────────────────────────────────────────────

function HealthBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Fair' : 'At Risk'
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${color}18`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label} · {score}
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'flat'
  trendLabel?: string
  loading?: boolean
}

function StatCard({ label, value, trend, trendLabel, loading }: StatCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-16" />
        ) : (
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        )}
      </div>
      {trendLabel && !loading && (
        <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {trendLabel}
        </div>
      )}
      {loading && <Skeleton className="mt-4 h-4 w-20" />}
    </div>
  )
}

// ── Event Row ─────────────────────────────────────────────────────────────────

function EventRow({ event, variant }: { event: Event; variant: 'active' | 'upcoming' }) {
  const dateInfo = formatEventDate(event.startDate)
  return (
    <div className="flex items-center gap-4">
      <div
        className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg font-bold leading-none"
        style={
          variant === 'active'
            ? { backgroundColor: TEAL, color: 'white' }
            : { backgroundColor: '#f1f5f9', color: '#64748b' }
        }
      >
        <span className="text-[10px] uppercase">{dateInfo.weekday}</span>
        <span className="text-lg">{dateInfo.day}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{event.name}</p>
        <p className="text-xs text-slate-500">{formatEventType(event.type)}</p>
      </div>
    </div>
  )
}

function EventPanelSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { id } = useParams<{ id: string }>()
  const { setActiveCohort } = useCohortStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (id) setActiveCohort(id)
  }, [id, setActiveCohort])

  const { data: cohortRes, isLoading: cohortLoading } = useQuery({
    queryKey: ['cohort', id],
    queryFn: () => cohortsApi.get(id!),
    enabled: !!id,
  })
  const cohort = (cohortRes?.data as { data?: { name: string; status: string } })?.data

  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ['cohort-stats', id],
    queryFn: () => cohortsApi.stats(id!),
    enabled: !!id,
  })
  const stats: DashboardStats | null = (statsRes?.data as { data?: DashboardStats })?.data ?? null

  const { data: eventsRes, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.listByCohort(id!, { limit: 50 }),
    enabled: !!id,
  })
  const events: Event[] = (eventsRes?.data as { data?: Event[] })?.data ?? []
  const activeEvents = events.filter((e) => e.status === 'in_progress')
  const upcomingEvents = events.filter((e) => e.status === 'not_started')

  const avgLabel = stats?.avgNormalizedScore !== null && stats?.avgNormalizedScore !== undefined
    ? `${stats.avgNormalizedScore}/100 normalized`
    : null

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Cohort header */}
      {cohortLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : cohort ? (
        <div>
          <h2 className="text-xl font-bold text-slate-900">{cohort.name}</h2>
          <p className="text-sm text-slate-500">Cohort Dashboard</p>
        </div>
      ) : null}

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Trainees"
          value={stats?.traineeCount ?? '—'}
          loading={statsLoading}
          trend="flat"
          trendLabel="Enrolled"
        />
        <StatCard
          label="Active Teams"
          value={stats?.activeTeamCount ?? '—'}
          loading={statsLoading}
          trend={stats?.activeTeamCount ? 'up' : 'flat'}
          trendLabel={stats?.activeTeamCount ? 'In active events' : 'None active'}
        />
        <StatCard
          label="Active Events"
          value={eventsLoading ? '—' : activeEvents.length}
          loading={eventsLoading}
          trend={activeEvents.length > 0 ? 'up' : 'flat'}
          trendLabel={activeEvents.length > 0 ? 'In Progress' : 'None Active'}
        />
        <StatCard
          label="Upcoming Events"
          value={eventsLoading ? '—' : upcomingEvents.length}
          loading={eventsLoading}
          trend="flat"
          trendLabel={upcomingEvents.length > 0 ? `Next: ${formatEventDate(upcomingEvents[0].startDate).weekday}` : 'None Scheduled'}
        />
        <StatCard
          label="Avg KPI Score"
          value={stats?.avgNormalizedScore !== null && stats?.avgNormalizedScore !== undefined ? `${stats.avgNormalizedScore}` : '—'}
          loading={statsLoading}
          trend={stats?.avgNormalizedScore !== null && stats?.avgNormalizedScore !== undefined
            ? (stats.avgNormalizedScore >= 70 ? 'up' : stats.avgNormalizedScore < 50 ? 'down' : 'flat')
            : 'flat'}
          trendLabel={avgLabel ?? 'No evaluations yet'}
        />
      </div>

      {/* AI Snapshot */}
      <div className="relative overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 sm:p-6">
        <div className="absolute right-4 top-4">
          <Zap className="h-10 w-10 rotate-12 text-indigo-100 sm:h-12 sm:w-12" />
        </div>
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-500">
          <Zap className="h-3.5 w-3.5" />
          AI Cohort Snapshot
        </div>
        {stats?.avgNormalizedScore !== null && stats?.avgNormalizedScore !== undefined ? (
          <p className="relative z-10 text-base italic leading-relaxed text-indigo-900 sm:text-lg">
            "{cohort?.name} is scoring <strong>{stats.avgNormalizedScore}/100</strong> on average across all evaluations.
            {stats.topTeams.length > 0 && ` Leading team: ${stats.topTeams[0].name} (${stats.topTeams[0].avgNormalizedScore}/100).`}
            {stats.activeTeamCount > 0 && ` ${stats.activeTeamCount} team${stats.activeTeamCount > 1 ? 's' : ''} currently active.`}
            {' '}Use MEST Intelligence for a deeper analysis."
          </p>
        ) : (
          <p className="relative z-10 text-base italic leading-relaxed text-indigo-900 sm:text-lg">
            "Track cohort momentum with real-time data. Performance insights will appear here once evaluations are submitted."
          </p>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column */}
        <div className="space-y-6 xl:col-span-8">
          {/* Attention Required */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Attention Required
              </h2>
              <button
                onClick={() => navigate(`/cohorts/${id}/analytics`)}
                className="text-sm font-semibold hover:underline"
                style={{ color: TEAL }}
              >
                View Analytics
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {statsLoading ? (
                <div className="space-y-3 px-4 py-5 sm:px-6">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-5 w-full" />)}
                </div>
              ) : stats?.topTeams.some((t) => t.healthScore < 50) ? (
                stats.topTeams.filter((t) => t.healthScore < 50).map((team) => (
                  <div key={team.id} className="flex items-center justify-between px-4 py-3 sm:px-6">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{team.name}</p>
                      <p className="text-xs text-slate-500">Health score below threshold</p>
                    </div>
                    <HealthBadge score={team.healthScore} />
                  </div>
                ))
              ) : (
                <div className="px-4 py-5 text-sm text-slate-400 italic sm:px-6">
                  No alerts at this time.
                </div>
              )}
            </div>
          </div>

          {/* High Potential */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <Star className="h-4 w-4 text-amber-400" />
                Top Performing Teams
              </h2>
              <button
                onClick={() => navigate('/teams')}
                className="text-sm font-semibold hover:underline"
                style={{ color: TEAL }}
              >
                All Teams
              </button>
            </div>
            {statsLoading ? (
              <div className="space-y-3 p-4 sm:p-6">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : stats?.topTeams.length ? (
              <div className="divide-y divide-slate-100">
                {stats.topTeams.map((team, i) => (
                  <div key={team.id} className="flex items-center gap-4 px-4 py-3 sm:px-6">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                      style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#b45309' }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{team.name}</p>
                      {team.productIdea && (
                        <p className="truncate text-xs text-slate-400">{team.productIdea}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold" style={{ color: TEAL }}>
                        {team.avgNormalizedScore}/100
                      </span>
                      <HealthBadge score={team.healthScore} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-sm text-slate-400 italic sm:p-6">
                Top performers will surface here once KPI evaluations are recorded.
              </div>
            )}
          </div>

          {/* Events */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Active Events</h2>
              </div>
              <div className="space-y-4 p-4 sm:p-6">
                {eventsLoading ? (
                  <EventPanelSkeleton />
                ) : activeEvents.length > 0 ? (
                  activeEvents.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => navigate(`/events/${e.id}`)}
                      className="w-full text-left transition-opacity hover:opacity-70"
                    >
                      <EventRow event={e} variant="active" />
                    </button>
                  ))
                ) : (
                  <p className="text-sm italic text-slate-400">No active events right now.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Upcoming Events</h2>
              </div>
              <div className="space-y-4 p-4 sm:p-6">
                {eventsLoading ? (
                  <EventPanelSkeleton />
                ) : upcomingEvents.length > 0 ? (
                  upcomingEvents.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => navigate(`/events/${e.id}`)}
                      className="w-full text-left transition-opacity hover:opacity-70"
                    >
                      <EventRow event={e} variant="upcoming" />
                    </button>
                  ))
                ) : (
                  <p className="text-sm italic text-slate-400">No upcoming events scheduled.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 xl:col-span-4">
          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: CalendarDays, label: 'Events', path: '/events' },
                { icon: Users, label: 'Trainees', path: '/trainees' },
                { icon: Network, label: 'Teams', path: '/teams' },
                { icon: BarChart2, label: 'Analytics', path: `/cohorts/${id}/analytics` },
              ].map(({ icon: Icon, label, path }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-4 transition-all hover:border-[#0d968b] hover:bg-[#0d968b]/5"
                >
                  <Icon className="mb-2 h-6 w-6 text-slate-400 transition-colors group-hover:text-[#0d968b]" />
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Activity</h2>
            </div>
            <div className="p-4 sm:p-6">
              {statsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats?.recentActivity.length ? (
                <div className="relative space-y-5 before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-100">
                  {stats.recentActivity.map((item, i) => (
                    <div key={i} className="relative pl-8">
                      <div
                        className="absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white"
                        style={{ borderColor: i === 0 ? TEAL : '#e2e8f0' }}
                      >
                        {i === 0
                          ? <CheckCircle2 className="h-3 w-3" style={{ color: TEAL }} />
                          : <Clock className="h-3 w-3 text-slate-300" />
                        }
                      </div>
                      <p className="text-sm font-semibold leading-snug text-slate-900">{item.text}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {item.teamCount} team{item.teamCount !== 1 ? 's' : ''} · {formatTimeAgo(item.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative space-y-5 before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-100">
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: TEAL }}>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: TEAL }} />
                    </div>
                    <p className="text-sm font-semibold leading-none text-slate-900">Dashboard initialized</p>
                    <p className="mt-1 text-xs text-slate-500">Just now</p>
                  </div>
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-200 bg-white">
                      <div className="h-2 w-2 rounded-full bg-slate-300" />
                    </div>
                    <p className="text-sm font-semibold leading-none text-slate-900">Activity log will populate as evaluations are submitted</p>
                    <p className="mt-1 text-xs text-slate-500">Pending</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate(`/cohorts/${id}/analytics`)}
                className="mt-6 w-full rounded bg-slate-50 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100"
              >
                Full Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
