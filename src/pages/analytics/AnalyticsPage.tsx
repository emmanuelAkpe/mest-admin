import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart2, TrendingUp, Target, Users } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import { cohortsApi } from '@/api/cohorts'
import { useCohortStore } from '@/store/cohort'
import { Skeleton } from '@/components/ui/Skeleton'
import type { CohortAnalytics } from '@/types'

const TEAL = '#0d968b'
const COLORS = ['#0d968b', '#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6']

function scoreColor(score: number | null) {
  if (score === null) return '#cbd5e1'
  if (score >= 75) return '#10b981'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

function ScoreLabel({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-400">No data</span>
  const color = scoreColor(score)
  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Developing' : 'Needs Work'
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-1 text-xs font-bold text-slate-600">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>/100
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
  const cohortName = (cohortRes?.data as { data?: { name: string } })?.data?.name ?? 'Cohort'

  const { data: analyticsRes, isLoading } = useQuery({
    queryKey: ['cohort-analytics', cohortId],
    queryFn: () => cohortsApi.analytics(cohortId!),
    enabled: !!cohortId,
  })
  const analytics: CohortAnalytics | null = (analyticsRes?.data as { data?: CohortAnalytics })?.data ?? null

  const eventsWithData = analytics?.eventPerformance.filter((e) => e.submissionCount > 0) ?? []

  // Event performance bar chart data
  const eventBarData = eventsWithData.map((e) => ({
    name: e.eventName.length > 16 ? e.eventName.slice(0, 16) + '…' : e.eventName,
    fullName: e.eventName,
    score: e.avgNormalizedScore,
    teams: e.teamCount,
  }))

  // Team scores per event — grouped by team across events
  const allTeamNames = [...new Set(
    eventsWithData.flatMap((e) => e.teamScores.map((t) => t.teamName))
  )]

  const teamLineData = eventsWithData.map((e) => {
    const point: Record<string, string | number> = { event: e.eventName.length > 14 ? e.eventName.slice(0, 14) + '…' : e.eventName }
    for (const ts of e.teamScores) {
      point[ts.teamName] = ts.avgNormalizedScore
    }
    return point
  })

  // KPI radar data
  const radarData = analytics?.kpiSummary.slice(0, 8).map((k) => ({
    kpi: k.kpiName.length > 18 ? k.kpiName.slice(0, 18) + '…' : k.kpiName,
    score: k.avgNormalizedScore,
    fullName: k.kpiName,
  })) ?? []

  const noData = !isLoading && eventsWithData.length === 0

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
          <p className="text-sm text-slate-500">Normalized scores (0–100) across all evaluations</p>
        </div>
      </div>

      {noData && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
          <BarChart2 className="mb-3 h-10 w-10 text-slate-200" />
          <p className="font-semibold text-slate-500">No evaluation data yet</p>
          <p className="mt-1 text-sm text-slate-400">Analytics will populate once evaluations are submitted for this cohort.</p>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
              <Skeleton className="mb-4 h-5 w-40" />
              <Skeleton className="h-56 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && eventsWithData.length > 0 && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* Event Performance */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-1 flex items-center gap-2">
              <BarChart2 className="h-4 w-4" style={{ color: TEAL }} />
              <h3 className="font-bold text-slate-900">Event Performance</h3>
            </div>
            <p className="mb-5 text-xs text-slate-400">Average normalized score per event</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={eventBarData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name="Avg Score" radius={[4, 4, 0, 0]}>
                  {eventBarData.map((entry, i) => (
                    <Cell key={i} fill={scoreColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-3 justify-center">
              {eventsWithData.map((e, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: scoreColor(e.avgNormalizedScore) }} />
                  <span className="text-xs text-slate-600 truncate max-w-[120px]">{e.eventName}</span>
                  <ScoreLabel score={e.avgNormalizedScore} />
                </div>
              ))}
            </div>
          </div>

          {/* Team Trajectories */}
          {allTeamNames.length > 0 && eventsWithData.length > 1 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-1 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: TEAL }} />
                <h3 className="font-bold text-slate-900">Team Trajectories</h3>
              </div>
              <p className="mb-5 text-xs text-slate-400">Score progression across events</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={teamLineData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="event" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  {allTeamNames.slice(0, 6).map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* KPI Radar */}
          {radarData.length >= 3 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-1 flex items-center gap-2">
                <Target className="h-4 w-4" style={{ color: TEAL }} />
                <h3 className="font-bold text-slate-900">KPI Profile</h3>
              </div>
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

          {/* KPI Bar Chart */}
          {analytics && analytics.kpiSummary.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-1 flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: TEAL }} />
                <h3 className="font-bold text-slate-900">KPI Breakdown</h3>
              </div>
              <p className="mb-5 text-xs text-slate-400">Ranked average score per criterion (all evaluations)</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  layout="vertical"
                  data={analytics.kpiSummary.slice(0, 8).map((k) => ({
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
                    {analytics.kpiSummary.slice(0, 8).map((entry, i) => (
                      <Cell key={i} fill={scoreColor(entry.avgNormalizedScore)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Team Scores Table */}
      {!isLoading && eventsWithData.length > 0 && (
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
                  {eventsWithData.map((e) => (
                    <th key={e.eventId} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                      {e.eventName.length > 14 ? e.eventName.slice(0, 14) + '…' : e.eventName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allTeamNames.map((teamName) => (
                  <tr key={teamName} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-800">{teamName}</td>
                    {eventsWithData.map((e) => {
                      const ts = e.teamScores.find((t) => t.teamName === teamName)
                      return (
                        <td key={e.eventId} className="px-4 py-3 text-center">
                          {ts ? (
                            <span
                              className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                              style={{ backgroundColor: scoreColor(ts.avgNormalizedScore) }}
                            >
                              {ts.avgNormalizedScore}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
