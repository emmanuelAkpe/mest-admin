import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Flag, Zap, Share2, ChevronDown, Check, ArrowLeft, Network, LogIn, LogOut, RefreshCw } from 'lucide-react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { traineesApi } from '@/api/trainees'
import { AvatarWithFallback } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { countryFlag } from '@/lib/countryFlag'
import type { Trainee, Cohort, MemberChange, Team } from '@/types'

const TEAL = '#0d968b'

function levelLabel(l: string) {
  return l.charAt(0).toUpperCase() + l.slice(1)
}

function levelScore(l: string) {
  return ({ none: 0, basic: 33, intermediate: 66, advanced: 100 } as Record<string, number>)[l] ?? 0
}

/* ── Stat Card ── */
function StatCard({ label, value, sub, bar }: { label: string; value: string; sub?: string; bar?: number }) {
  return (
    <div className="rounded-xl border border-[#0d968b]/10 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold sm:text-3xl" style={{ color: TEAL }}>{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#0d968b]/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${bar}%`, backgroundColor: TEAL }} />
        </div>
      )}
      {sub && <p className="mt-2 text-xs font-medium text-slate-400">{sub}</p>}
    </div>
  )
}

/* ── Skills Radar ── */
function SkillsRadar({ trainee }: { trainee: Trainee }) {
  const entryNorm = trainee.entryScore !== null ? (trainee.entryScore / 10) * 100 : 0

  const data = [
    { skill: 'Technical', score: levelScore(trainee.technicalBackground) },
    { skill: 'AI Skills', score: levelScore(trainee.aiSkillLevel) },
    { skill: 'Entry Score', score: Math.round(entryNorm) },
    { skill: 'Attendance', score: 0 },
    { skill: 'KPI Avg', score: 0 },
  ]

  const hasRealData = data.some((d) => d.score > 0)

  return (
    <div className="rounded-xl border border-[#0d968b]/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Skills Snapshot</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Entry Baseline
        </span>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
            />
            <Tooltip
              formatter={(v: number) => [`${v}%`, 'Score']}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            <Radar
              dataKey="score"
              stroke={TEAL}
              fill={TEAL}
              fillOpacity={0.15}
              strokeWidth={2}
              dot={{ r: 3, fill: TEAL }}
            />
          </RadarChart>
        </ResponsiveContainer>

        {!hasRealData && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/70 backdrop-blur-[2px]">
            <p className="text-sm italic text-slate-400">Full data after evaluations</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
        {data.map(({ skill, score }) => (
          <div key={skill} className="text-center">
            <p className="text-[10px] font-bold uppercase text-slate-400">{skill}</p>
            <p className="text-sm font-bold" style={{ color: score > 0 ? TEAL : '#cbd5e1' }}>
              {score > 0 ? `${score}%` : '—'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Performance Trend (empty state until KPI data exists) ── */
function PerformanceTrend() {
  return (
    <div className="rounded-xl border border-[#0d968b]/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Performance Trend</h3>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TEAL }} />
          <span className="text-xs text-slate-500">KPI over time</span>
        </div>
      </div>
      {/* Empty chart frame */}
      <div className="relative h-44 overflow-hidden rounded-lg bg-slate-50">
        {/* Y-axis gridlines */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute inset-x-0 h-px bg-slate-200"
            style={{ bottom: `${i * 33}%` }}
          />
        ))}
        {/* Y labels */}
        <div className="absolute inset-y-0 left-2 flex flex-col justify-between py-2">
          {['10', '7.5', '5', '2.5', '0'].map((l) => (
            <span key={l} className="text-[10px] text-slate-300">{l}</span>
          ))}
        </div>
        {/* Placeholder bars */}
        <div className="absolute inset-x-10 bottom-0 flex items-end justify-around pb-6">
          {['M1', 'M2', 'M3', 'M4', 'M5', 'M6'].map((m) => (
            <div key={m} className="flex flex-col items-center gap-1">
              <div className="w-6 rounded-t-sm bg-slate-200" style={{ height: `${Math.random() * 0 + 4}px` }} />
              <span className="text-[10px] text-slate-300">{m}</span>
            </div>
          ))}
        </div>
        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 backdrop-blur-[1px]">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: `${TEAL}15` }}
          >
            <Zap className="h-5 w-5" style={{ color: TEAL }} />
          </div>
          <p className="text-sm font-semibold text-slate-700">No KPI Data Yet</p>
          <p className="text-xs text-slate-400">Trend will populate after evaluations are submitted</p>
        </div>
      </div>
    </div>
  )
}

/* ── Collapsible ── */
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <h3 className="font-bold text-slate-900">{title}</h3>
        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

/* ── Loading skeleton ── */
function ProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 sm:p-6">
      <div className="flex flex-col items-center gap-6 rounded-xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row">
        <Skeleton className="h-28 w-28 shrink-0 rounded-full sm:h-32 sm:w-32" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="flex gap-3">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/* ── Team History ── */
function TeamHistory({ traineeId }: { traineeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['trainee-member-changes', traineeId],
    queryFn: () => traineesApi.listMemberChanges(traineeId),
  })

  const raw = data?.data
  const changes: MemberChange[] = Array.isArray(raw) ? raw : (raw as { data?: MemberChange[] })?.data ?? []

  const CHANGE_META: Record<MemberChange['changeType'], { icon: React.ReactNode; label: string; color: string }> = {
    joined:       { icon: <LogIn className="h-3.5 w-3.5" />,    label: 'Joined',       color: '#16a34a' },
    left:         { icon: <LogOut className="h-3.5 w-3.5" />,   label: 'Left',         color: '#ef4444' },
    role_changed: { icon: <RefreshCw className="h-3.5 w-3.5" />, label: 'Role changed', color: '#d97706' },
  }

  function teamName(t: string | Team | null): string {
    if (!t) return ''
    return typeof t === 'object' ? t.name : t
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
      </div>
    )
  }

  if (!changes.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Network className="h-8 w-8 text-slate-200" />
        <p className="text-sm italic text-slate-400">No team membership history recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="relative pl-5">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-0 h-full w-px bg-slate-100" />

      <div className="space-y-4">
        {changes.map((c) => {
          const meta = CHANGE_META[c.changeType]
          const team = typeof c.team === 'object' ? c.team : null
          const destTeam = c.destinationTeam ? teamName(c.destinationTeam) : null
          const date = new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

          return (
            <div key={c.id} className="relative flex gap-3">
              {/* Dot */}
              <span
                className="absolute -left-5 mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: meta.color }}
              >
                {meta.icon}
              </span>

              <div className="flex-1 rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-sm font-semibold text-slate-800">
                    <span style={{ color: meta.color }}>{meta.label}</span>
                    {team && <span className="font-normal text-slate-600"> · {team.name}</span>}
                  </p>
                  <span className="text-xs text-slate-400">{date}</span>
                </div>

                {/* Role change detail */}
                {c.changeType === 'role_changed' && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    {(c.previousRoles ?? []).length > 0
                      ? (c.previousRoles as string[]).map(r => (
                        <span key={r} className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-400 line-through">{r.replace('_', ' ')}</span>
                      ))
                      : <span className="text-slate-400 italic">no roles</span>}
                    <span className="text-slate-300">→</span>
                    {(c.newRoles ?? []).length > 0
                      ? (c.newRoles as string[]).map(r => (
                        <span key={r} className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ backgroundColor: TEAL }}>{r.replace('_', ' ')}</span>
                      ))
                      : <span className="text-slate-400 italic">no roles</span>}
                  </div>
                )}

                {/* Destination team */}
                {c.changeType === 'left' && destTeam && (
                  <p className="mt-1 text-xs text-slate-500">Moved to: <span className="font-medium">{destTeam}</span></p>
                )}

                {/* Reason */}
                {c.reason && (
                  <p className="mt-1 text-xs italic text-slate-400">"{c.reason}"</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   Page
══════════════════════════════════════════════ */
export function TraineeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trainee', id],
    queryFn: () => traineesApi.get(id!),
    enabled: !!id,
  })

  const { data: changesData } = useQuery({
    queryKey: ['trainee-member-changes', id],
    queryFn: () => traineesApi.listMemberChanges(id!),
    enabled: !!id,
  })
  const changesRaw = changesData?.data
  const memberChanges: MemberChange[] = Array.isArray(changesRaw)
    ? changesRaw
    : (changesRaw as { data?: MemberChange[] })?.data ?? []
  const teamsJoined = new Set(memberChanges.filter(c => c.changeType === 'joined').map(c =>
    typeof c.team === 'object' ? c.team.id : c.team
  )).size

  const trainee: Trainee | undefined = (data?.data as { data?: Trainee })?.data
  const cohort = trainee?.cohort as Cohort | undefined

  if (isLoading) return <ProfileSkeleton />
  if (isError || !trainee) {
    return <div className="p-8 text-sm text-red-500">Failed to load trainee profile.</div>
  }

  const fullName = `${trainee.firstName} ${trainee.lastName}`
  const cohortLabel = typeof cohort === 'object' ? cohort.name : 'Cohort'

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 sm:p-6">

      {/* ── Back button ── */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Trainees
      </button>

      {/* ── Profile Header ── */}
      <section className="flex flex-col items-center gap-6 rounded-xl border border-[#0d968b]/10 bg-white p-5 shadow-sm sm:flex-row sm:p-6">
        {/* Avatar — no border ring */}
        <div className="relative shrink-0">
          <AvatarWithFallback src={trainee.photo} name={fullName} size="xl" />
          <span
            className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white sm:h-6 sm:w-6 ${
              trainee.isActive ? 'bg-green-500' : 'bg-slate-300'
            }`}
          />
        </div>

        {/* Info */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{fullName}</h1>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold uppercase"
                style={{ backgroundColor: `${TEAL}1a`, color: TEAL }}
              >
                {levelLabel(trainee.technicalBackground)} Tech
              </span>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold uppercase"
                style={{ backgroundColor: `${TEAL}1a`, color: TEAL }}
              >
                AI: {levelLabel(trainee.aiSkillLevel)}
              </span>
            </div>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-sm text-slate-500 sm:justify-start">
            <MapPin className="h-3.5 w-3.5" />
            {cohortLabel} •{' '}
            {countryFlag(trainee.country) && (
              <span className="text-base leading-none">{countryFlag(trainee.country)}</span>
            )}
            {trainee.country}
          </p>

          {trainee.bio && (
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600">{trainee.bio}</p>
          )}

          {/* Social links */}
          {(trainee.linkedIn || trainee.github || trainee.portfolio) && (
            <div className="flex flex-wrap justify-center gap-3 pt-1 sm:justify-start">
              {trainee.linkedIn && (
                <a href={trainee.linkedIn.startsWith('http') ? trainee.linkedIn : `https://${trainee.linkedIn}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium text-slate-500 hover:text-[#0d968b] underline underline-offset-2">
                  LinkedIn
                </a>
              )}
              {trainee.github && (
                <a href={trainee.github.startsWith('http') ? trainee.github : `https://${trainee.github}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium text-slate-500 hover:text-[#0d968b] underline underline-offset-2">
                  GitHub
                </a>
              )}
              {trainee.portfolio && (
                <a href={trainee.portfolio.startsWith('http') ? trainee.portfolio : `https://${trainee.portfolio}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs font-medium text-slate-500 hover:text-[#0d968b] underline underline-offset-2">
                  Portfolio
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right: Share + mini stats */}
        <div className="flex flex-col items-center gap-3 sm:items-end">
          <button
            onClick={handleShare}
            className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors"
            style={{ backgroundColor: `${TEAL}1a`, color: TEAL }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share'}
          </button>

          <div className="flex gap-4">
            <div className="p-3 text-center">
              <p className="text-xs font-bold uppercase text-slate-400">Status</p>
              <p className="font-bold" style={{ color: TEAL }}>{trainee.isActive ? 'Active' : 'Inactive'}</p>
            </div>
            <div className="h-10 w-px self-center bg-[#0d968b]/10" />
            <div className="p-3 text-center">
              <p className="text-xs font-bold uppercase text-slate-400">Entry Score</p>
              <p className="font-bold" style={{ color: TEAL }}>
                {trainee.entryScore !== null ? trainee.entryScore : '—'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Summary Stats ── */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard label="Attendance" value="—" sub="Pending evaluations" bar={0} />
        <StatCard label="Avg KPI" value="—" sub="No evaluations yet" />
        <StatCard label="Teams Joined" value={teamsJoined > 0 ? String(teamsJoined) : '—'} sub={teamsJoined > 0 ? `${teamsJoined} team${teamsJoined !== 1 ? 's' : ''}` : 'No team history yet'} />
        <StatCard
          label="Entry Score"
          value={trainee.entryScore !== null ? String(trainee.entryScore) : '—'}
          sub="At cohort entry"
          bar={trainee.entryScore !== null ? trainee.entryScore * 10 : undefined}
        />
      </section>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <SkillsRadar trainee={trainee} />
          <PerformanceTrend />

        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* AI Insights */}
          <div className="relative overflow-hidden rounded-xl bg-indigo-600 p-5 text-white shadow-lg sm:p-6">
            <div className="absolute right-4 top-4 opacity-20">
              <Zap className="h-14 w-14 rotate-12" />
            </div>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <Zap className="h-5 w-5" /> AI Insights
            </h3>
            <div className="relative z-10 space-y-4">
              <div className="rounded-lg border border-white/20 bg-white/10 p-3">
                <p className="mb-1 text-xs font-bold uppercase opacity-80">Status</p>
                <p className="text-lg font-bold italic">"Awaiting Data"</p>
              </div>
              <p className="text-sm leading-relaxed opacity-90">
                AI-generated insights will surface once this trainee's KPI evaluations and team performance data are recorded.
              </p>
              <div className="flex flex-wrap gap-2">
                {trainee.technicalBackground !== 'none' && (
                  <span className="rounded bg-white/20 px-2 py-1 text-[10px]">
                    {levelLabel(trainee.technicalBackground)} Tech
                  </span>
                )}
                {trainee.aiSkillLevel !== 'none' && (
                  <span className="rounded bg-white/20 px-2 py-1 text-[10px]">
                    AI: {levelLabel(trainee.aiSkillLevel)}
                  </span>
                )}
                <span className="rounded bg-white/20 px-2 py-1 text-[10px]">{trainee.country}</span>
              </div>
            </div>
          </div>

          {/* Mentor Reviews + Facilitator Log */}
          <div className="overflow-hidden rounded-xl border border-[#0d968b]/10 bg-white shadow-sm divide-y divide-[#0d968b]/5">
            <Collapsible title="Mentor Reviews">
              <p className="text-sm italic text-slate-400">No mentor reviews have been submitted yet.</p>
            </Collapsible>
            <Collapsible title="Facilitator Log">
              <p className="text-sm italic text-slate-400">No facilitator notes recorded yet.</p>
            </Collapsible>
          </div>

          {/* Flags */}
          <div className="rounded-xl border border-[#0d968b]/10 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
              <Flag className="h-4 w-4 text-red-500" />
              Flags
            </h3>
            <p className="text-sm italic text-slate-400">No active flags for this trainee.</p>
          </div>
        </div>
      </div>

      {/* ── Team History (full width) ── */}
      <section className="rounded-xl border border-[#0d968b]/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <Network className="h-4 w-4" style={{ color: TEAL }} />
          <h3 className="font-bold text-slate-900">Team Membership History</h3>
        </div>
        <TeamHistory traineeId={id!} />
      </section>
    </div>
  )
}
