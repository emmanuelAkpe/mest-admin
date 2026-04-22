import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, BarChart2, TrendingUp, Target, Users,
  Calendar, CheckCircle2, Clock, AlertCircle, Minus,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Legend,
} from 'recharts'
import { cohortsApi } from '@/api/cohorts'
import { useCohortStore } from '@/store/cohort'
import { Skeleton } from '@/components/ui/Skeleton'

const TEAL = '#0d968b'
const COLORS = ['#0d968b', '#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6']

function scoreColor(score: number | null) {
  if (score === null) return '#cbd5e1'
  if (score >= 75) return '#10b981'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-400">—</span>
  const bg = scoreColor(score)
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
      style={{ backgroundColor: bg }}
    >
      {score}
    </span>
  )
}

function EventStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    upcoming: { label: 'Upcoming', icon: <Clock className="h-3 w-3" />, className: 'bg-slate-100 text-slate-500' },
    active:   { label: 'Active',   icon: <AlertCircle className="h-3 w-3" />, className: 'bg-blue-50 text-blue-600' },
    completed: { label: 'Completed', icon: <CheckCircle2 className="h-3 w-3" />, className: 'bg-emerald-50 text-emerald-600' },
  }
  const s = map[status] ?? map.upcoming
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}>
      {s.icon}{s.label}
    </span>
  )
}

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1.5 text-3xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: '#f0fdfb' }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-xs">
      <p className="mb-1 font-bold text-slate-600">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value ?? '—'}</strong>{typeof p.value === 'number' ? '/100' : ''}
        </p>
      ))}
    </div>
  )
}

export function AnalyticsPage() {
  const { id } = useParams<{ id: string }>()
  const { activeCohortId } = useCohortStore()
  const navigate = useNavigate()
  const cohortId = id ?? activeCohortId

  const { data: cohortRes } = useQuery({
    queryKey: ['cohort', cohortId],
    queryFn: () => cohortsApi.get(cohortId!),
    enabled: !!cohortId,
  })
  const cohortName = (cohortRes?.data as any)?.data?.name ?? 'Cohort'

  const { data: analyticsRes, isLoading } = useQuery({
    queryKey: ['cohort-analytics', cohortId],
    queryFn: () => cohortsApi.analytics(cohortId!),
    enabled: !!cohortId,
  })
  const analytics = (analyticsRes?.data as any)?.data ?? null

  const overview    = analytics?.overview ?? {}
  const events      = analytics?.eventPerformance ?? []
  const teams       = analytics?.teamsRoster ?? []
  const kpiSummary  = analytics?.kpiSummary ?? []
  const trajectories = analytics?.teamTrajectories ?? []

  const hasScores = events.some((e: any) => e.submissionCount > 0)

  // Chart data
  const eventBarData = events
    .filter((e: any) => e.submissionCount > 0)
    .map((e: any) => ({
      name: e.eventName.length > 16 ? e.eventName.slice(0, 16) + '…' : e.eventName,
      fullName: e.eventName,
      score: e.avgNormalizedScore,
    }))

  const allTeamNames = [...new Set(
    trajectories.flatMap((t: any) => t.teamName)
  )]

  const teamLineData = events
    .filter((e: any) => e.submissionCount > 0)
    .map((e: any) => {
      const point: Record<string, any> = { event: e.eventName.length > 14 ? e.eventName.slice(0, 14) + '…' : e.eventName }
      for (const ts of e.teamScores ?? []) {
        if (ts.avgNormalizedScore !== null) point[ts.teamName] = ts.avgNormalizedScore
      }
      return point
    })

  const lineTeamNames = [...new Set(teamLineData.flatMap((d: any) => Object.keys(d).filter(k => k !== 'event')))]

  const radarData = kpiSummary.slice(0, 8).map((k: any) => ({
    kpi: k.kpiName.length > 18 ? k.kpiName.slice(0, 18) + '…' : k.kpiName,
    score: k.avgNormalizedScore,
    fullName: k.kpiName,
  }))

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(cohortId ? `/cohorts/${cohortId}` : '/select-cohort')}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{cohortName} — Analytics</h2>
          <p className="text-sm text-slate-500">Programme performance and team overview</p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      )}

      {!isLoading && analytics && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Active Teams"
              value={overview.totalTeams ?? 0}
              sub={overview.dissolvedTeams > 0 ? `${overview.dissolvedTeams} dissolved` : 'No dissolutions'}
              icon={<Users className="h-4 w-4" style={{ color: TEAL }} />}
            />
            <StatCard
              label="Trainees"
              value={overview.totalTrainees ?? 0}
              icon={<Users className="h-4 w-4" style={{ color: TEAL }} />}
            />
            <StatCard
              label="Events"
              value={overview.totalEvents ?? 0}
              sub={`${overview.eventsEvaluated ?? 0} evaluated`}
              icon={<Calendar className="h-4 w-4" style={{ color: TEAL }} />}
            />
            <StatCard
              label="Avg Cohort Score"
              value={overview.avgCohortScore !== null && overview.avgCohortScore !== undefined ? `${overview.avgCohortScore}/100` : '—'}
              sub={overview.avgCohortScore === null ? 'No evaluations yet' : undefined}
              icon={<BarChart2 className="h-4 w-4" style={{ color: TEAL }} />}
            />
          </div>

          {/* Events Progress */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" style={{ color: TEAL }} />
                <h3 className="font-bold text-slate-900">Events Progress</h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">Evaluation status per event</p>
            </div>
            <div className="divide-y divide-slate-100">
              {events.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-slate-400">No events configured for this cohort.</p>
              )}
              {events.map((event: any) => (
                <div key={event.eventId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                      <Calendar className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{event.eventName}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {event.endDate && event.endDate !== event.date && (
                          <> — {new Date(event.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        )}
                        <span className="mx-1.5 text-slate-200">·</span>
                        <span className="capitalize">{event.eventType.replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pl-11 sm:pl-0">
                    <EventStatusBadge status={event.status} />
                    <span className="text-xs text-slate-500">
                      <strong className="text-slate-700">{event.teamCount}</strong> team{event.teamCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-slate-500">
                      <strong className="text-slate-700">{event.submissionCount}</strong> submission{event.submissionCount !== 1 ? 's' : ''}
                    </span>
                    {event.avgNormalizedScore !== null ? (
                      <ScoreBadge score={event.avgNormalizedScore} />
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-400">
                        <Minus className="h-3 w-3" /> Pending
                      </span>
                    )}
                  </div>
                  {/* Team score pills */}
                  {event.teamScores?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pl-11 sm:pl-0">
                      {event.teamScores.map((ts: any) => (
                        <div key={ts.teamId} className="flex items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1">
                          <span className="text-xs font-medium text-slate-700">{ts.teamName}</span>
                          <ScoreBadge score={ts.avgNormalizedScore} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Teams Roster */}
          {teams.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" style={{ color: TEAL }} />
                  <h3 className="font-bold text-slate-900">Teams</h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{teams.length} active team{teams.length !== 1 ? 's' : ''} · {overview.totalTrainees} trainees</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Team</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Members</th>
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400 hidden md:table-cell">Product</th>
                      <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Evals</th>
                      <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teams.map((team: any) => (
                      <tr key={team.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{team.name}</p>
                          <p className="text-xs text-slate-400">{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            {team.members.slice(0, 3).map((m: any, i: number) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-700">{m.name}</span>
                                {m.roles.length > 0 && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                    {m.roles[0]}
                                  </span>
                                )}
                              </div>
                            ))}
                            {team.members.length > 3 && (
                              <span className="text-xs text-slate-400">+{team.members.length - 3} more</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <p className="max-w-[220px] text-xs text-slate-600 leading-relaxed">
                            {team.productIdea || <span className="text-slate-300 italic">Not set</span>}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-sm font-semibold text-slate-700">{team.evalCount}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <ScoreBadge score={team.avgScore} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Score Charts — only when evaluation data exists */}
          {hasScores && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <BarChart2 className="h-4 w-4" style={{ color: TEAL }} />
                <h3 className="font-bold text-slate-900">Evaluation Results</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Event Performance */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                  <h4 className="mb-1 font-semibold text-slate-800">Event Performance</h4>
                  <p className="mb-5 text-xs text-slate-400">Average normalized score per event</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={eventBarData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="score" name="Avg Score" radius={[4, 4, 0, 0]}>
                        {eventBarData.map((entry: any, i: number) => (
                          <Cell key={i} fill={scoreColor(entry.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Team Trajectories */}
                {lineTeamNames.length > 0 && teamLineData.length > 1 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h4 className="mb-1 font-semibold text-slate-800">Team Trajectories</h4>
                    <p className="mb-5 text-xs text-slate-400">Score progression across events</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={teamLineData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="event" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        {lineTeamNames.slice(0, 6).map((name: any, i: number) => (
                          <Line
                            key={name} type="monotone" dataKey={name}
                            stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                            dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* KPI Radar */}
                {radarData.length >= 3 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h4 className="mb-1 font-semibold text-slate-800">KPI Profile</h4>
                    <p className="mb-5 text-xs text-slate-400">Average cohort score per evaluation criterion</p>
                    <ResponsiveContainer width="100%" height={260}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="kpi" tick={{ fontSize: 10, fill: '#64748b' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                        <Radar name="Avg Score" dataKey="score" stroke={TEAL} fill={TEAL} fillOpacity={0.2} strokeWidth={2} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]?.payload
                            return (
                              <div className="rounded-lg border border-slate-200 bg-white p-2 shadow text-xs">
                                <p className="font-bold text-slate-700">{d?.fullName}</p>
                                <p style={{ color: TEAL }}>Score: <strong>{d?.score}/100</strong></p>
                              </div>
                            )
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* KPI Breakdown */}
                {kpiSummary.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h4 className="mb-1 font-semibold text-slate-800">KPI Breakdown</h4>
                    <p className="mb-5 text-xs text-slate-400">Ranked average score per criterion</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        layout="vertical"
                        data={kpiSummary.slice(0, 8).map((k: any) => ({
                          name: k.kpiName.length > 22 ? k.kpiName.slice(0, 22) + '…' : k.kpiName,
                          score: k.avgNormalizedScore,
                          dataPoints: k.dataPoints,
                        }))}
                        margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]
                            return (
                              <div className="rounded-lg border border-slate-200 bg-white p-2 shadow text-xs">
                                <p className="font-bold text-slate-700">{d?.payload?.name}</p>
                                <p style={{ color: TEAL }}>Score: <strong>{d?.value}/100</strong></p>
                                <p className="text-slate-400">{d?.payload?.dataPoints} data points</p>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                          {kpiSummary.slice(0, 8).map((entry: any, i: number) => (
                            <Cell key={i} fill={scoreColor(entry.avgNormalizedScore)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Team Scores Table */}
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h3 className="font-bold text-slate-900">Team Scores per Event</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Normalized 0–100 score per team, per event</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Team</th>
                        {events.filter((e: any) => e.submissionCount > 0).map((e: any) => (
                          <th key={e.eventId} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                            {e.eventName.length > 14 ? e.eventName.slice(0, 14) + '…' : e.eventName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teams.map((team: any) => (
                        <tr key={team.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-semibold text-slate-800">{team.name}</td>
                          {events.filter((e: any) => e.submissionCount > 0).map((e: any) => {
                            const ts = e.teamScores?.find((t: any) => t.teamId === team.id)
                            return (
                              <td key={e.eventId} className="px-4 py-3 text-center">
                                <ScoreBadge score={ts?.avgNormalizedScore ?? null} />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
