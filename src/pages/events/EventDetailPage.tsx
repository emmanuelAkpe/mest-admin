import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock,
  Plus,
  Users,
  Pencil,
  Trash2,
  Check,
  X as XIcon,
  BarChart2,
  LayoutDashboard,
  FileText,
  Link2,
  Copy,
  CheckCheck,
  AlertTriangle,
  ExternalLink,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  ListChecks,
  RefreshCw,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { eventsApi } from '@/api/events'
import { teamsApi } from '@/api/teams'
import { kpisApi, type CreateKpiPayload } from '@/api/kpis'
import { evaluationLinksApi, type EvalInsightContent } from '@/api/evaluationLinks'
import { useCohortStore } from '@/store/cohort'
import { Skeleton } from '@/components/ui/Skeleton'
import { CreateEventModal } from './CreateEventModal'
import { GenerateEvaluationLinkModal } from './GenerateEvaluationLinkModal'
import type { Event, EventStatus, EventType, Team, TeamStatus, Kpi, ScaleType, KpiAppliesTo, EvaluationLink, EvaluationLinkStatus } from '@/types'

const TEAL = '#0d968b'

/* ── Helpers ── */
function formatEventType(type: string) {
  const map: Record<string, string> = {
    startup_build: 'Startup Build',
    newco: 'NewCo',
    class_workshop: 'Class / Workshop',
    internal_review: 'Internal Review',
    demo_pitch_day: 'Demo / Pitch Day',
    other: 'Other',
  }
  return map[type] ?? type
}

function formatStatus(s: string) {
  const map: Record<string, string> = {
    not_started: 'Upcoming',
    in_progress: 'Active',
    completed: 'Completed',
  }
  return map[s] ?? s
}

function formatTeamStatus(s: TeamStatus): string {
  const map: Record<TeamStatus, string> = {
    not_started: 'Not Started',
    active: 'Active',
    completed: 'Completed',
    dissolved: 'Dissolved',
  }
  return map[s]
}

function isProgramType(type: EventType): boolean {
  return type === 'startup_build' || type === 'newco'
}

function getDaysLabel(event: Event): string {
  const now = new Date()
  const start = parseISO(event.startDate)
  const end = parseISO(event.endDate)
  if (event.status === 'not_started') {
    const days = differenceInDays(start, now)
    return `Starts in ${days} day${days !== 1 ? 's' : ''}`
  }
  if (event.status === 'in_progress') {
    const days = differenceInDays(end, now)
    return `${days} day${days !== 1 ? 's' : ''} left`
  }
  const days = differenceInDays(now, end)
  return `Ended ${days} day${days !== 1 ? 's' : ''} ago`
}

function getParentEventId(event: Event): string | null {
  if (!event.parentEvent) return null
  if (typeof event.parentEvent === 'string') return event.parentEvent
  return event.parentEvent.id
}

function getParentEventName(event: Event): string | null {
  if (!event.parentEvent) return null
  if (typeof event.parentEvent === 'object') return event.parentEvent.name
  return null
}

/* ── Badges ── */
function EventStatusBadge({ status, large }: { status: EventStatus; large?: boolean }) {
  const base = large
    ? 'rounded-full px-4 py-1.5 text-sm font-bold uppercase'
    : 'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase'

  switch (status) {
    case 'not_started':
      return <span className={`${base} bg-slate-100 text-slate-500`}>Upcoming</span>
    case 'in_progress':
      return (
        <span className={`${base} text-white`} style={{ backgroundColor: TEAL }}>
          Active
        </span>
      )
    case 'completed':
      return <span className={`${base} bg-blue-50 text-blue-600`}>Completed</span>
  }
}

function TeamStatusBadge({ status }: { status: TeamStatus }) {
  const map: Record<TeamStatus, string> = {
    not_started: 'bg-slate-100 text-slate-500',
    active: 'text-white',
    completed: 'bg-blue-50 text-blue-600',
    dissolved: 'bg-red-50 text-red-500',
  }
  const isActive = status === 'active'
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${map[status]}`}
      style={isActive ? { backgroundColor: TEAL } : undefined}
    >
      {formatTeamStatus(status)}
    </span>
  )
}

function SessionTimelineDotCls(status: EventStatus): string {
  switch (status) {
    case 'in_progress':
      return 'bg-[#0d968b] ring-2 ring-teal-200'
    case 'completed':
      return 'bg-blue-500 ring-2 ring-blue-100'
    default:
      return 'bg-slate-300 ring-2 ring-slate-100'
  }
}

/* ── Skeletons ── */
function EventDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 sm:p-6">
      <Skeleton className="h-5 w-36" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   PROGRAM VIEW
══════════════════════════════════════════════ */
function ProgramDetailView({
  event,
  childSessions,
  sessionsLoading,
}: {
  event: Event
  childSessions: Event[]
  sessionsLoading: boolean
}) {
  const navigate = useNavigate()
  const { activeCohortId } = useCohortStore()
  const [showAddSession, setShowAddSession] = useState(false)

  const startDate = parseISO(event.startDate)
  const endDate = parseISO(event.endDate)
  const durationDays = differenceInDays(endDate, startDate)

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </button>

      {/* Header card */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: TEAL }}
            >
              <CalendarDays className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {event.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {formatEventType(event.type)}
                </span>
                <span className="text-sm text-slate-400">
                  {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <EventStatusBadge status={event.status} large />
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50">
              Edit
            </button>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          {
            label: 'Duration',
            value: `${durationDays} day${durationDays !== 1 ? 's' : ''}`,
            icon: <Clock className="h-4 w-4" />,
          },
          {
            label: 'Sessions',
            value: sessionsLoading ? '—' : String(childSessions.length),
            icon: <CalendarDays className="h-4 w-4" />,
          },
          {
            label: 'Teams',
            value: '—',
            icon: <Users className="h-4 w-4" />,
          },
          {
            label: 'Status',
            value: formatStatus(event.status),
            icon: <CalendarDays className="h-4 w-4" />,
          },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
              <span className="text-slate-400">{icon}</span>
              {label}
            </div>
            <p className="mt-1 truncate text-xl font-bold sm:text-2xl" style={{ color: TEAL }}>
              {value}
            </p>
          </div>
        ))}
      </section>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left col-span-2: sessions timeline */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900">Sessions</h2>
                {!sessionsLoading && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                    {childSessions.length}
                  </span>
                )}
              </div>
            </div>

            {sessionsLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <Skeleton className="h-20 flex-1 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : childSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center sm:px-6">
                <CalendarDays className="mb-2 h-8 w-8 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">No sessions yet</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Add the first session to this program.
                </p>
              </div>
            ) : (
              <div className="relative px-5 py-4 sm:px-6">
                {/* Timeline line */}
                <div className="absolute left-[2.375rem] sm:left-[2.875rem] top-4 bottom-4 w-0.5 bg-slate-100" />
                <div className="space-y-4">
                  {childSessions.map((session) => {
                    const sStart = parseISO(session.startDate)
                    const sEnd = parseISO(session.endDate)
                    return (
                      <div
                        key={session.id}
                        className="flex gap-4 cursor-pointer"
                        onClick={() => navigate(`/events/${session.id}`)}
                      >
                        {/* Date circle */}
                        <div
                          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold ${SessionTimelineDotCls(session.status)}`}
                        >
                          {format(sStart, 'd')}
                        </div>

                        {/* Session card */}
                        <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-slate-200 hover:bg-white transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-900 truncate">{session.name}</p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {formatEventType(session.type)} &middot;{' '}
                                {format(sStart, 'MMM d')} – {format(sEnd, 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <EventStatusBadge status={session.status} />
                              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Add session */}
            <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
              <button
                onClick={() => setShowAddSession(true)}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-[#0d968b] hover:text-[#0d968b] w-full justify-center"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Session
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-3 font-bold text-slate-900">Description</h3>
            {event.description ? (
              <p className="text-sm leading-relaxed text-slate-700">{event.description}</p>
            ) : (
              <p className="text-sm italic text-slate-400">No description provided.</p>
            )}
          </div>

          {/* Quick Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 font-bold text-slate-900">Quick Info</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Start Date</dt>
                <dd className="mt-0.5 text-slate-700">{format(startDate, 'MMM d, yyyy')}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">End Date</dt>
                <dd className="mt-0.5 text-slate-700">{format(endDate, 'MMM d, yyyy')}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Created</dt>
                <dd className="mt-0.5 text-slate-700">{format(parseISO(event.createdAt), 'MMM d, yyyy')}</dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 font-bold text-slate-900">Quick Actions</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('/teams')}
                className="flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-slate-50"
                style={{ borderColor: TEAL, color: TEAL }}
              >
                <Users className="h-4 w-4" />
                Create Team
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddSession && activeCohortId && (
        <CreateEventModal
          onClose={() => setShowAddSession(false)}
          parentId={event.id}
          programs={[event]}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   KPI PANEL
══════════════════════════════════════════════ */
const SCALE_LABELS: Record<ScaleType, string> = {
  '1_to_5': '1–5',
  '1_to_10': '1–10',
  percentage: '%',
  custom: 'Custom',
}

const APPLIES_LABELS: Record<KpiAppliesTo, string> = {
  team: 'Team',
  individual: 'Individual',
  both: 'Both',
}

const inputCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]'
const selectCls = inputCls

function KpiPanel({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['kpis', eventId],
    queryFn: () => kpisApi.listByEvent(eventId),
  })

  const rawKpis = (data?.data as { data?: Kpi[] })?.data ?? []
  const kpis: Kpi[] = Array.isArray(rawKpis) ? rawKpis : []

  const { mutate: deleteKpi } = useMutation({
    mutationFn: (id: string) => kpisApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kpis', eventId] }),
  })

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4" style={{ color: TEAL }} />
          <h3 className="font-bold text-slate-900">KPI Framework</h3>
          {kpis.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">{kpis.length}</span>
          )}
        </div>
        <button
          onClick={() => { setShowAdd(v => !v); setEditingId(null) }}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors"
          style={{ backgroundColor: `${TEAL}15`, color: TEAL }}
        >
          <Plus className="h-3.5 w-3.5" /> Add KPI
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <KpiForm
            eventId={eventId}
            onSaved={() => { setShowAdd(false); queryClient.invalidateQueries({ queryKey: ['kpis', eventId] }) }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {/* KPI list */}
      {isLoading ? (
        <div className="space-y-2 p-5">
          {[1, 2].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : kpis.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
          <BarChart2 className="h-7 w-7 text-slate-200" />
          <p className="text-sm font-medium text-slate-500">No KPIs defined yet</p>
          <p className="text-xs text-slate-400">Add KPIs to score and evaluate teams in this session.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {kpis.map(kpi => (
            <div key={kpi.id}>
              {editingId === kpi.id ? (
                <div className="bg-slate-50 px-5 py-4">
                  <KpiForm
                    eventId={eventId}
                    existing={kpi}
                    onSaved={() => { setEditingId(null); queryClient.invalidateQueries({ queryKey: ['kpis', eventId] }) }}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{kpi.name}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{SCALE_LABELS[kpi.scaleType]}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{APPLIES_LABELS[kpi.appliesTo]}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: TEAL }}>w: {kpi.weight}</span>
                    </div>
                    {kpi.description && <p className="mt-0.5 text-xs text-slate-400 truncate">{kpi.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => { setEditingId(kpi.id); setShowAdd(false) }}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteKpi(kpi.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KpiForm({
  eventId,
  existing,
  onSaved,
  onCancel,
}: {
  eventId: string
  existing?: Kpi
  onSaved: () => void
  onCancel: () => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [weight, setWeight] = useState(String(existing?.weight ?? 1))
  const [scaleType, setScaleType] = useState<ScaleType>(existing?.scaleType ?? '1_to_10')
  const [appliesTo, setAppliesTo] = useState<KpiAppliesTo>(existing?.appliesTo ?? 'team')
  const [requireComment, setRequireComment] = useState(existing?.requireComment ?? false)
  const [showRubric, setShowRubric] = useState((existing?.rubric?.length ?? 0) > 0)
  const [rubric, setRubric] = useState<{ score: string; label: string; description: string }[]>(
    existing?.rubric?.map((r) => ({ score: String(r.score), label: r.label, description: r.description ?? '' })) ?? []
  )

  const scalePoints: number[] = scaleType === '1_to_5' ? [1, 2, 3, 4, 5]
    : scaleType === '1_to_10' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    : scaleType === 'percentage' ? [0, 25, 50, 75, 100]
    : []

  function initRubric() {
    if (scalePoints.length > 0) {
      setRubric(scalePoints.map((s) => ({ score: String(s), label: '', description: '' })))
    } else {
      setRubric([{ score: '', label: '', description: '' }])
    }
    setShowRubric(true)
  }

  function updateRubricRow(i: number, field: 'score' | 'label' | 'description', val: string) {
    setRubric((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  function addRubricRow() {
    setRubric((prev) => [...prev, { score: '', label: '', description: '' }])
  }

  function removeRubricRow(i: number) {
    setRubric((prev) => prev.filter((_, idx) => idx !== i))
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: CreateKpiPayload) =>
      existing ? kpisApi.update(existing.id, payload) : kpisApi.create(eventId, payload),
    onSuccess: onSaved,
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const cleanRubric = rubric
      .filter((r) => r.label.trim() && r.score !== '')
      .map((r) => ({ score: Number(r.score), label: r.label.trim(), description: r.description.trim() || undefined }))
    mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      weight: Number(weight),
      scaleType,
      appliesTo,
      requireComment,
      rubric: cleanRubric.length > 0 ? cleanRubric : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <input className={inputCls} placeholder="KPI name *" required value={name} onChange={e => setName(e.target.value)} />
        </div>
        <input className={inputCls} placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
        <input className={inputCls} type="number" min="0" step="0.1" placeholder="Weight *" required value={weight} onChange={e => setWeight(e.target.value)} />
        <select className={selectCls} value={scaleType} onChange={e => setScaleType(e.target.value as ScaleType)}>
          <option value="1_to_10">Scale 1–10</option>
          <option value="1_to_5">Scale 1–5</option>
          <option value="percentage">Percentage</option>
          <option value="custom">Custom</option>
        </select>
        <select className={selectCls} value={appliesTo} onChange={e => setAppliesTo(e.target.value as KpiAppliesTo)}>
          <option value="team">Applies to Team</option>
          <option value="individual">Applies to Individual</option>
          <option value="both">Applies to Both</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input type="checkbox" checked={requireComment} onChange={e => setRequireComment(e.target.checked)} className="rounded border-slate-300 accent-[#0d968b]" />
        Require comment from evaluator
      </label>

      {/* Rubric Builder */}
      <div className="rounded-lg border border-slate-200 bg-slate-50">
        <button
          type="button"
          onClick={() => showRubric ? setShowRubric(false) : (rubric.length === 0 ? initRubric() : setShowRubric(true))}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <span className="flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5" style={{ color: TEAL }} />
            Scoring Rubric
            {rubric.filter(r => r.label.trim()).length > 0 && (
              <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: TEAL }}>
                {rubric.filter(r => r.label.trim()).length}
              </span>
            )}
          </span>
          {showRubric ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showRubric && (
          <div className="border-t border-slate-200 p-3 space-y-2">
            <p className="text-[10px] text-slate-400">Define what each score level means to guide evaluator judgement.</p>
            {rubric.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <input
                  className="h-8 w-14 shrink-0 rounded border border-slate-200 bg-white px-2 text-center text-xs outline-none focus:border-[#0d968b]"
                  type="number"
                  placeholder="Score"
                  value={row.score}
                  onChange={(e) => updateRubricRow(i, 'score', e.target.value)}
                />
                <div className="flex flex-1 flex-col gap-1.5">
                  <input
                    className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#0d968b]"
                    placeholder="Label (e.g. Exceptional)"
                    value={row.label}
                    onChange={(e) => updateRubricRow(i, 'label', e.target.value)}
                  />
                  <input
                    className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#0d968b]"
                    placeholder="Description (e.g. Deep customer discovery with data)"
                    value={row.description}
                    onChange={(e) => updateRubricRow(i, 'description', e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRubricRow(i)}
                  className="mt-1 text-slate-300 hover:text-red-400"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRubricRow}
              className="flex items-center gap-1 text-xs font-semibold hover:underline"
              style={{ color: TEAL }}
            >
              <Plus className="h-3 w-3" /> Add level
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
          <XIcon className="h-3.5 w-3.5" /> Cancel
        </button>
        <button type="submit" disabled={isPending} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50" style={{ backgroundColor: TEAL }}>
          <Check className="h-3.5 w-3.5" /> {isPending ? 'Saving…' : existing ? 'Update' : 'Add KPI'}
        </button>
      </div>
    </form>
  )
}

/* ══════════════════════════════════════════════
   SESSION VIEW
══════════════════════════════════════════════ */
type SessionTab = 'overview' | 'teams' | 'kpis' | 'evaluations'

const SESSION_TABS: { id: SessionTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Overview',       icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { id: 'teams',       label: 'Teams',          icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'kpis',        label: 'KPI Framework',  icon: <BarChart2 className="h-3.5 w-3.5" /> },
  { id: 'evaluations', label: 'Evaluations',    icon: <Link2 className="h-3.5 w-3.5" /> },
]

/* ── Evaluation status badge ── */
function EvalStatusBadge({ status }: { status: EvaluationLinkStatus }) {
  const map: Record<EvaluationLinkStatus, { label: string; cls: string }> = {
    not_opened: { label: 'Not Opened', cls: 'bg-slate-100 text-slate-500' },
    opened:     { label: 'Opened',     cls: 'bg-amber-50 text-amber-600' },
    submitted:  { label: 'Submitted',  cls: 'bg-emerald-50 text-emerald-600' },
  }
  const s = map[status]
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.cls}`}>
      {s.label}
    </span>
  )
}

/* ── Evaluations panel ── */
function EvaluationsPanel({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient()
  const [showGenerate, setShowGenerate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [resentId, setResentId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'links' | 'results' | 'insights'>('links')

  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: ['eval-links', eventId],
    queryFn: () => evaluationLinksApi.listByEvent(eventId),
    staleTime: 30_000,
  })
  const rawLinks = (linksData?.data as { data?: EvaluationLink[] })?.data ?? []
  const links: EvaluationLink[] = Array.isArray(rawLinks) ? rawLinks : []

  const { data: resultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ['eval-results', eventId],
    queryFn: () => evaluationLinksApi.results(eventId),
    enabled: activeView === 'results',
    staleTime: 30_000,
  })
  const results = (resultsData?.data as { data?: EvalResults })?.data ?? null

  const { data: insightsData, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ['eval-insights', eventId],
    queryFn: () => evaluationLinksApi.getInsights(eventId),
    enabled: activeView === 'insights',
    staleTime: Infinity,
    retry: false,
  })
  const savedInsight = (insightsData?.data as { data?: { content: EvalInsightContent; generatedAt: string } })?.data ?? null

  const { mutate: runGenerate, isPending: generating } = useMutation({
    mutationFn: () => evaluationLinksApi.generateInsights(eventId),
    onSuccess: () => refetchInsights(),
  })

  const { mutate: revoke } = useMutation({
    mutationFn: (id: string) => evaluationLinksApi.revoke(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eval-links', eventId] }),
  })

  const { mutate: resendLink } = useMutation({
    mutationFn: (id: string) => evaluationLinksApi.resend(id),
    onMutate: (id) => { setResendingId(id); setResendError(null) },
    onSuccess: (_data, id) => {
      setResendingId(null)
      setResentId(id)
      setTimeout(() => setResentId(null), 3000)
    },
    onError: (err: unknown, _id) => {
      setResendingId(null)
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Failed to resend. Try again.'
      setResendError(msg)
      setTimeout(() => setResendError(null), 5000)
    },
  })

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const submittedCount = links.filter((l) => l.status === 'submitted').length
  const activeCount = links.filter((l) => !l.isRevoked).length

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(['links', 'results', 'insights'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                activeView === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v === 'insights' && <Sparkles className="h-3 w-3" />}
              {v === 'links' ? 'Eval Links' : v === 'results' ? 'Results' : 'AI Insights'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white"
          style={{ backgroundColor: TEAL }}
        >
          <Link2 className="h-3.5 w-3.5" /> Generate Link
        </button>
      </div>

      {activeView === 'links' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Stats strip */}
          {links.length > 0 && (
            <div className="flex divide-x divide-slate-100 border-b border-slate-100">
              {[
                { label: 'Total Links', value: links.length },
                { label: 'Active',      value: activeCount },
                { label: 'Submitted',   value: submittedCount },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 px-4 py-3 text-center">
                  <p className="text-lg font-extrabold" style={{ color: TEAL }}>{value}</p>
                  <p className="text-[10px] text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          )}

          {resendError && (
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {resendError}
            </div>
          )}

          {linksLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
              <Link2 className="mb-2 h-8 w-8 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">No evaluation links yet</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Generate a link to share with a judge, facilitator, or expert
              </p>
              <button
                onClick={() => setShowGenerate(true)}
                className="mt-4 rounded-lg px-4 py-2 text-xs font-bold text-white"
                style={{ backgroundColor: TEAL }}
              >
                Generate First Link
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {links.map((link) => {
                const teamNames = link.teams
                  .map((t) => (typeof t === 'object' ? (t as Team).name : ''))
                  .filter(Boolean)
                  .join(', ')
                return (
                  <div key={link.id} className={`px-5 py-4 ${link.isRevoked ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{link.evaluatorName}</p>
                          {link.isRevoked ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">Revoked</span>
                          ) : (
                            <EvalStatusBadge status={link.status} />
                          )}
                        </div>
                        {link.evaluatorEmail && (
                          <p className="mt-0.5 text-xs text-slate-400">{link.evaluatorEmail}</p>
                        )}
                        {teamNames && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            Teams: {teamNames}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-slate-400">
                          Expires {format(parseISO(link.expiresAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      {!link.isRevoked && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => copyLink(link.evalUrl ?? `${window.location.origin}/evaluate/${link.id}`, link.id)}
                            className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-slate-50"
                            title="Copy link"
                          >
                            {copiedId === link.id
                              ? <><CheckCheck className="h-3 w-3 text-emerald-500" /> Copied</>
                              : <><Copy className="h-3 w-3" /> Copy</>}
                          </button>
                          {link.evaluatorEmail && (
                            <button
                              onClick={() => resendLink(link.id)}
                              disabled={!!resendingId || resentId === link.id}
                              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-slate-50 disabled:opacity-60"
                              title={`Resend to ${link.evaluatorEmail}`}
                            >
                              {resendingId === link.id
                                ? <><div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" /> Sending…</>
                                : resentId === link.id
                                  ? <><CheckCheck className="h-3 w-3 text-emerald-500" /> Sent</>
                                  : <><Send className="h-3 w-3" /> Resend</>}
                            </button>
                          )}
                          <button
                            onClick={() => revoke(link.id)}
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-50"
                          >
                            Revoke
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeView === 'results' && (
        <div className="space-y-5">
          {resultsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : !results || results.teamResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
              <BarChart2 className="mb-2 h-8 w-8 text-slate-200" />
              <p className="text-sm font-medium text-slate-500">No results yet</p>
              <p className="mt-0.5 text-xs text-slate-400">Results appear once evaluators submit their scores</p>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Evaluators',    value: results.evaluatorCount },
                  { label: 'Links Issued',  value: results.meta.linksIssued },
                  { label: 'Teams Scored',  value: results.teamResults.filter((t) => t.overallAvg !== null).length },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                    <p className="text-2xl font-extrabold" style={{ color: TEAL }}>{value}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Per-team results */}
              {[...results.teamResults]
                .sort((a, b) => (b.overallAvg ?? 0) - (a.overallAvg ?? 0))
                .map((team, rank) => (
                  <div key={team.teamId} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-slate-400">#{rank + 1}</span>
                        <p className="font-bold text-slate-900">{team.teamName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold" style={{ color: TEAL }}>
                          {team.overallAvg !== null ? team.overallAvg.toFixed(2) : '—'}
                        </p>
                        <p className="text-[10px] text-slate-400">Overall Avg</p>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {team.kpis.map((kpi) => (
                        <div key={kpi.kpiId} className="flex items-center gap-3 px-5 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-700">{kpi.kpiName}</p>
                              {kpi.divergent && (
                                <span title="High score divergence" className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                                  <AlertTriangle className="h-3 w-3" /> Divergent
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">{kpi.scoreCount} score{kpi.scoreCount !== 1 ? 's' : ''} · weight {kpi.weight}</p>
                          </div>
                          <p className="shrink-0 text-sm font-bold text-slate-900">
                            {kpi.avgScore !== null ? kpi.avgScore.toFixed(1) : '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </>
          )}
        </div>
      )}

      {activeView === 'insights' && (
        <AiInsightsPanel
          insight={savedInsight}
          loading={insightsLoading || generating}
          onGenerate={() => runGenerate()}
        />
      )}

      {showGenerate && (
        <GenerateEvaluationLinkModal
          eventId={eventId}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </div>
  )
}

/* ── AI Insights Panel ── */
const STRENGTH_LABELS = {
  excellent: { label: 'Excellent Cohort', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  good: { label: 'Good Cohort', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  developing: { label: 'Developing Cohort', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  needs_support: { label: 'Needs Support', cls: 'bg-red-50 text-red-700 border-red-200' },
}

const READINESS_LABELS = {
  investor_ready: { label: 'Investor Ready', cls: 'bg-emerald-50 text-emerald-700' },
  near_ready: { label: 'Near Ready', cls: 'bg-teal-50 text-teal-700' },
  needs_work: { label: 'Needs Work', cls: 'bg-amber-50 text-amber-700' },
  early_stage: { label: 'Early Stage', cls: 'bg-slate-100 text-slate-600' },
}

const URGENCY_LABELS = {
  immediate: { label: 'Immediate', cls: 'bg-red-50 text-red-600' },
  this_week: { label: 'This Week', cls: 'bg-amber-50 text-amber-600' },
  this_month: { label: 'This Month', cls: 'bg-blue-50 text-blue-600' },
}

function TeamInsightCard({ analysis }: { analysis: EvalInsightContent['teamAnalyses'][0] }) {
  const [open, setOpen] = useState(false)
  const readiness = READINESS_LABELS[analysis.readinessLevel] ?? READINESS_LABELS.early_stage

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-slate-900">{analysis.teamName}</p>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${readiness.cls}`}>
              {readiness.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{analysis.verdict}</p>
        </div>
        {open
          ? <ChevronUp className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
          : <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4 text-sm">
          <p className="italic text-slate-600">"{analysis.verdict}"</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                <TrendingUp className="h-3 w-3" /> Strengths
              </p>
              <ul className="space-y-1">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" /> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                <TrendingDown className="h-3 w-3" /> Improvements
              </p>
              <ul className="space-y-1">
                {analysis.improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" /> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-slate-50 p-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Judge Consensus</p>
              <p className="mt-0.5 text-xs text-slate-600">{analysis.judgeConsensus}</p>
            </div>
            {analysis.divergence && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Divergence</p>
                <p className="mt-0.5 text-xs text-slate-600">{analysis.divergence}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border-l-4 border-teal-400 bg-teal-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Recommendation</p>
            <p className="mt-0.5 text-xs font-semibold text-teal-900">{analysis.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function AiInsightsPanel({
  insight,
  loading,
  onGenerate,
}: {
  insight: { content: EvalInsightContent; generatedAt: string } | null
  loading: boolean
  onGenerate: () => void
}) {
  const content = insight?.content

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: '#0d968b20' }}>
          <Sparkles className="h-6 w-6 animate-pulse" style={{ color: TEAL }} />
        </div>
        <p className="text-sm font-bold text-slate-800">Gemini is analysing evaluations…</p>
        <p className="mt-1 text-xs text-slate-400">Reading all judge comments and scores. This takes ~15 seconds.</p>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: '#0d968b20' }}>
          <Sparkles className="h-6 w-6" style={{ color: TEAL }} />
        </div>
        <p className="text-sm font-bold text-slate-800">No AI insights yet</p>
        <p className="mt-1 mb-5 text-xs text-slate-400">
          Generate a deep analysis of all evaluator scores and comments.
        </p>
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-md"
          style={{ backgroundColor: TEAL }}
        >
          <Sparkles className="h-4 w-4" /> Generate AI Insights
        </button>
      </div>
    )
  }

  const strengthMeta = STRENGTH_LABELS[content.cohortStrength] ?? STRENGTH_LABELS.developing

  return (
    <div className="space-y-5">
      {/* Event Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" style={{ color: TEAL }} />
            <p className="text-sm font-bold text-slate-900">AI Event Summary</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${strengthMeta.cls}`}>
              {strengthMeta.label}
            </span>
            <button
              onClick={onGenerate}
              title="Regenerate"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{content.eventSummary}</p>
        {content.cohortPattern && (
          <p className="rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-500 italic">
            <span className="font-semibold not-italic text-slate-700">Pattern: </span>
            {content.cohortPattern}
          </p>
        )}
        {insight?.generatedAt && (
          <p className="text-[10px] text-slate-300">
            Generated {format(parseISO(insight.generatedAt), 'MMM d, yyyy · h:mm a')}
          </p>
        )}
      </div>

      {/* Rankings */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
          <Trophy className="h-4 w-4" style={{ color: TEAL }} />
          <p className="text-sm font-bold text-slate-900">Team Rankings</p>
        </div>
        <div className="divide-y divide-slate-50">
          {content.rankings.map((r) => (
            <div key={r.teamId} className="flex items-start gap-4 px-5 py-3.5">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
                r.rank === 1 ? 'bg-yellow-400' : r.rank === 2 ? 'bg-slate-400' : r.rank === 3 ? 'bg-amber-600' : 'bg-slate-200 !text-slate-500'
              }`}>
                {r.rank}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-sm">{r.teamName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.headline}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-team analysis */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Team Analyses</p>
        {content.teamAnalyses.map((a) => (
          <TeamInsightCard key={a.teamId} analysis={a} />
        ))}
      </div>

      {/* Standout Insights */}
      {content.standoutInsights.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-bold text-slate-900">Standout Insights</p>
          </div>
          <div className="divide-y divide-slate-50">
            {content.standoutInsights.map((s, i) => (
              <div key={i} className="px-5 py-4 space-y-1">
                <p className="text-sm font-semibold text-slate-800">{s.insight}</p>
                <p className="text-xs text-slate-500">{s.significance}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facilitator Actions */}
      {content.facilitatorActions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <ListChecks className="h-4 w-4" style={{ color: TEAL }} />
            <p className="text-sm font-bold text-slate-900">Facilitator Actions</p>
          </div>
          <div className="divide-y divide-slate-50">
            {content.facilitatorActions.map((a, i) => {
              const u = URGENCY_LABELS[a.urgency] ?? URGENCY_LABELS.this_month
              return (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${u.cls}`}>
                    {u.label}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">{a.action}</p>
                    {a.targetTeams.length > 0 && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {a.targetTeams.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface EvalResults {
  evaluatorCount: number
  meta: { linksIssued: number; submitted: number }
  teamResults: Array<{
    teamId: string
    teamName: string
    overallAvg: number | null
    kpis: Array<{
      kpiId: string
      kpiName: string
      weight: number
      scaleType: string
      avgScore: number | null
      scoreCount: number
      divergent: boolean
    }>
  }>
}

function SessionDetailView({
  event,
  teams,
  teamsLoading,
}: {
  event: Event
  teams: Team[]
  teamsLoading: boolean
}) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<SessionTab>('overview')

  const startDate = parseISO(event.startDate)
  const endDate = parseISO(event.endDate)
  const durationDays = differenceInDays(endDate, startDate)

  const parentName = getParentEventName(event)
  const parentId = getParentEventId(event)

  const tabBadges: Partial<Record<SessionTab, number>> = {
    teams: teams.length,
  }

  /* ── Tab content ── */

  const overviewTab = (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Left col-span-2 */}
      <div className="space-y-5 lg:col-span-2">
        {/* Description */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <h3 className="font-bold text-slate-900">Description</h3>
          </div>
          {event.description ? (
            <p className="text-sm leading-relaxed text-slate-700">{event.description}</p>
          ) : (
            <p className="text-sm italic text-slate-400">No description provided for this session.</p>
          )}
        </div>

        {/* Timeline summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-900">Timeline</h3>
          <div className="relative space-y-0">
            {/* vertical line */}
            <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-slate-100" />
            {[
              {
                label: 'Session starts',
                date: format(startDate, 'EEEE, MMM d yyyy'),
                dot: event.status === 'not_started' ? 'bg-slate-300' : 'bg-[#0d968b]',
              },
              {
                label: getDaysLabel(event),
                date: event.status === 'in_progress' ? 'Currently active' : event.status === 'completed' ? 'Finished' : 'Not started yet',
                dot: event.status === 'in_progress' ? 'bg-[#0d968b] ring-2 ring-teal-200' : event.status === 'completed' ? 'bg-blue-500' : 'bg-slate-200',
              },
              {
                label: 'Session ends',
                date: format(endDate, 'EEEE, MMM d yyyy'),
                dot: event.status === 'completed' ? 'bg-blue-500' : 'bg-slate-200',
              },
            ].map(({ label, date, dot }) => (
              <div key={label} className="relative flex items-start gap-4 pb-5 last:pb-0">
                <div className={`relative z-10 mt-0.5 h-6 w-6 shrink-0 rounded-full ${dot}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-400">{date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-5">
        {/* Event details card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-bold text-slate-900">Details</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</dt>
              <dd className="mt-0.5 text-slate-700">{formatEventType(event.type)}</dd>
            </div>
            {parentName && parentId && (
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Program</dt>
                <dd className="mt-0.5">
                  <button
                    onClick={() => navigate(`/events/${parentId}`)}
                    className="text-sm font-medium hover:underline"
                    style={{ color: TEAL }}
                  >
                    {parentName}
                  </button>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Start Date</dt>
              <dd className="mt-0.5 text-slate-700">{format(startDate, 'MMM d, yyyy')}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">End Date</dt>
              <dd className="mt-0.5 text-slate-700">{format(endDate, 'MMM d, yyyy')}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Duration</dt>
              <dd className="mt-0.5 text-slate-700">{durationDays} day{durationDays !== 1 ? 's' : ''}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Created</dt>
              <dd className="mt-0.5 text-slate-700">{format(parseISO(event.createdAt), 'MMM d, yyyy')}</dd>
            </div>
          </dl>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Teams',    value: teamsLoading ? '—' : String(teams.length) },
            { label: 'Status',   value: formatStatus(event.status) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
              <p className="text-xl font-extrabold" style={{ color: TEAL }}>{value}</p>
              <p className="text-[11px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* KPI summary shortcut */}
        <button
          onClick={() => setActiveTab('kpis')}
          className="w-full rounded-xl border border-dashed px-5 py-4 text-left transition-colors hover:bg-slate-50"
          style={{ borderColor: TEAL }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="h-4 w-4" style={{ color: TEAL }} />
            <span className="text-sm font-semibold" style={{ color: TEAL }}>Configure KPIs →</span>
          </div>
          <p className="text-xs text-slate-400">Set up the scoring framework for this session</p>
        </button>
      </div>
    </div>
  )

  const teamsTab = (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-900">Teams</h2>
          {!teamsLoading && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
              {teams.length}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/teams')}
          className="text-sm font-medium transition-colors hover:underline"
          style={{ color: TEAL }}
        >
          Manage Teams
        </button>
      </div>

      {teamsLoading ? (
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
          <Users className="mb-2 h-9 w-9 text-slate-200" />
          <p className="text-sm font-medium text-slate-500">No teams yet</p>
          <p className="mt-0.5 text-xs text-slate-400">Teams assigned to this session will appear here.</p>
          <button
            onClick={() => navigate('/teams')}
            className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            Go to Teams
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {teams.map((team) => (
            <div
              key={team.id}
              onClick={() => navigate(`/teams/${team.id}`)}
              className="flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-50"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: TEAL }}
              >
                {team.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{team.name}</p>
                <p className="text-xs text-slate-400">
                  {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                </p>
              </div>
              <TeamStatusBadge status={team.status} />
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const kpisTab = <KpiPanel eventId={event.id} />
  const evaluationsTab = <EvaluationsPanel eventId={event.id} />

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      {/* Back + breadcrumb */}
      <div className="mb-5 flex flex-col gap-1">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        {parentName && parentId && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <button
              onClick={() => navigate(`/events/${parentId}`)}
              className="hover:underline"
              style={{ color: TEAL }}
            >
              {parentName}
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600 font-medium">{event.name}</span>
          </div>
        )}
      </div>

      {/* Header card */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {event.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {formatEventType(event.type)}
              </span>
              <span className="text-sm text-slate-400">
                {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
              </span>
              {parentName && parentId && (
                <button
                  onClick={() => navigate(`/events/${parentId}`)}
                  className="text-xs hover:underline"
                  style={{ color: TEAL }}
                >
                  ↑ {parentName}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <EventStatusBadge status={event.status} large />
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50">
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
        {SESSION_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const badge = tabBadges[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {badge !== undefined && badge > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? 'text-white' : 'bg-slate-200 text-slate-500'
                  }`}
                  style={isActive ? { backgroundColor: TEAL } : undefined}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview'    && overviewTab}
      {activeTab === 'teams'       && teamsTab}
      {activeTab === 'kpis'        && kpisTab}
      {activeTab === 'evaluations' && evaluationsTab}
    </div>
  )
}

/* ══════════════════════════════════════════════
   EventDetailPage (orchestrator)
══════════════════════════════════════════════ */
export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { activeCohortId } = useCohortStore()

  const { data: eventData, isLoading: eventLoading, isError: eventError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.get(id!),
    enabled: !!id,
  })

  // Defensive parse
  const raw = (eventData?.data as { data?: unknown })?.data
  const event: Event | undefined =
    raw && typeof raw === 'object' && 'id' in (raw as object)
      ? (raw as Event)
      : (raw as { event?: Event })?.event

  const isProgram = event ? isProgramType(event.type) : false

  // Fetch teams (for session view) or all events (to filter sessions for program view)
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['event-teams', id],
    queryFn: () => teamsApi.listByEvent(id!),
    enabled: !!id && !isProgram,
  })

  const { data: allEventsData, isLoading: allEventsLoading } = useQuery({
    queryKey: ['events', activeCohortId],
    queryFn: () => eventsApi.listByCohort(activeCohortId!, { limit: 100 }),
    enabled: !!activeCohortId && isProgram,
  })

  const rawTeams = (teamsData?.data as { data?: unknown })?.data
  const teams: Team[] = Array.isArray(rawTeams)
    ? (rawTeams as Team[])
    : ((rawTeams as { teams?: Team[] })?.teams ?? [])

  const allEvents: Event[] = (allEventsData?.data as { data?: Event[] })?.data ?? []
  const childSessions = id
    ? allEvents.filter(
        (e) =>
          e.parentEvent === id ||
          (typeof e.parentEvent === 'object' && e.parentEvent !== null && e.parentEvent.id === id),
      )
    : []

  if (eventLoading) return <EventDetailSkeleton />
  if (eventError || !event) {
    return <div className="p-8 text-sm text-red-500">Failed to load event.</div>
  }

  if (isProgram) {
    return (
      <ProgramDetailView
        event={event}
        childSessions={childSessions}
        sessionsLoading={allEventsLoading}
      />
    )
  }

  return (
    <SessionDetailView
      event={event}
      teams={teams}
      teamsLoading={teamsLoading}
    />
  )
}
