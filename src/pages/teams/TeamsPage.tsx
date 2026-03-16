import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, Target, Plus, Search, GitBranch, ArrowRight, Network, ChevronRight, UserX } from 'lucide-react'
import { teamsApi } from '@/api/teams'
import { eventsApi } from '@/api/events'
import { traineesApi } from '@/api/trainees'
import { useCohortStore } from '@/store/cohort'
import { AvatarWithFallback } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { CreateTeamModal } from './CreateTeamModal'
import type { Team, Trainee, Event } from '@/types'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

const STATUS_ACCENT: Record<Team['status'], string> = {
  active:      TEAL,
  completed:   '#2563eb',
  not_started: '#94a3b8',
  dissolved:   '#ef4444',
}

const STATUS_LABEL: Record<Team['status'], string> = {
  active: 'Active', completed: 'Completed', not_started: 'Not Started', dissolved: 'Dissolved',
}

function getParentId(event: Event): string | null {
  if (!event.parentEvent) return null
  if (typeof event.parentEvent === 'string') return event.parentEvent
  return event.parentEvent.id
}

function TeamCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="h-1 w-full bg-slate-100" />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center gap-1 pt-2">
          {[0,1,2].map(i => <Skeleton key={i} className={`h-8 w-8 rounded-full ${i > 0 ? '-ml-2' : ''}`} />)}
        </div>
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}

function TeamCard({ team }: { team: Team }) {
  const navigate = useNavigate()
  const displayMembers = team.members.slice(0, 5)
  const extraCount = team.members.length - 5
  const accent = STATUS_ACCENT[team.status]

  return (
    <div
      onClick={() => navigate(`/teams/${team.id}`)}
      className="group cursor-pointer rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-slate-300"
    >
      <div className="h-1 w-full" style={{ backgroundColor: accent }} />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-slate-900 leading-snug group-hover:text-[#0d968b] transition-colors">{team.name}</h3>
          <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: accent }}>
            {STATUS_LABEL[team.status]}
          </span>
        </div>

        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
          {team.productIdea
            ? <span className="italic">{team.productIdea}</span>
            : <span className="italic text-slate-300">No product idea yet</span>
          }
        </p>

        {team.marketFocus && (
          <div className="flex items-center gap-1.5">
            <Target className="h-3 w-3 text-slate-300 shrink-0" />
            <span className="text-xs text-slate-400 truncate">{team.marketFocus}</span>
          </div>
        )}

        {team.members.length > 0 ? (
          <div className="flex items-center pt-1">
            {displayMembers.map((m, i) => {
              const trainee = m.trainee as Trainee
              const name = typeof trainee === 'object' ? `${trainee.firstName} ${trainee.lastName}` : 'Member'
              const photo = typeof trainee === 'object' ? trainee.photo : null
              return (
                <span key={typeof trainee === 'object' ? trainee.id : i} className={i > 0 ? '-ml-2' : ''} style={{ zIndex: displayMembers.length - i, position: 'relative' }}>
                  <AvatarWithFallback src={photo} name={name} size="sm" className="ring-2 ring-white" />
                </span>
              )
            })}
            {extraCount > 0 && (
              <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white" style={{ backgroundColor: TEAL, position: 'relative' }}>
                +{extraCount}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-1">
            <Users className="h-3.5 w-3.5 text-slate-300" />
            <span className="text-xs italic text-slate-300">No members yet</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-400">{team.members.length} member{team.members.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-3">
            {team.pivots.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <GitBranch className="h-3 w-3" /> {team.pivots.length}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs font-medium text-slate-400 group-hover:text-[#0d968b] transition-colors">
              View <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Event tab strip ──────────────────────────────────────────────────────────
// Shows programs with sessions nested beneath them. Standalone events are shown flat.
function EventTabs({
  events,
  selectedEventId,
  onSelect,
}: {
  events: Event[]
  selectedEventId: string | null
  onSelect: (id: string) => void
}) {
  const programs = events.filter(e => (e.type === 'startup_build' || e.type === 'newco') && !e.parentEvent)
  const sessions = events.filter(e => !!e.parentEvent)
  const standalone = events.filter(e => e.type !== 'startup_build' && e.type !== 'newco' && !e.parentEvent)

  const getSessionsFor = (programId: string) =>
    sessions.filter(s => getParentId(s) === programId)

  const renderTab = (ev: Event, indent = false) => {
    const isSelected = ev.id === selectedEventId
    const isLive = ev.status === 'in_progress'
    return (
      <button
        key={ev.id}
        onClick={() => onSelect(ev.id)}
        className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${indent ? 'ml-4' : ''}`}
        style={isSelected ? { backgroundColor: TEAL, color: '#fff' } : { backgroundColor: '#f1f5f9', color: '#475569' }}
      >
        {indent && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: isLive ? (isSelected ? '#fff' : TEAL) : (isSelected ? 'rgba(255,255,255,0.5)' : '#cbd5e1') }} />
        <span className="truncate max-w-[140px]">{ev.name}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 pb-1">
      {programs.map(program => (
        <div key={program.id} className="flex flex-wrap gap-2">
          {renderTab(program)}
          {getSessionsFor(program.id).map(s => renderTab(s, true))}
        </div>
      ))}
      {standalone.map(ev => renderTab(ev))}
    </div>
  )
}

// ── Unassigned trainees ──────────────────────────────────────────────────────
function toIdString(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  // Plain object — try id, _id, then toString
  const o = val as Record<string, unknown>
  if (typeof o['id'] === 'string' && o['id']) return o['id']
  if (typeof o['_id'] === 'string' && o['_id']) return o['_id']
  // ObjectId instance (has toString method returning hex)
  if (typeof (o['_id'] as { toString?: () => string })?.toString === 'function') {
    const s = (o['_id'] as { toString: () => string }).toString()
    if (s.length === 24) return s
  }
  if (typeof (val as { toString?: () => string })?.toString === 'function') {
    const s = (val as { toString: () => string }).toString()
    if (s.length === 24) return s
  }
  return ''
}

function UnassignedTrainees({ teams, cohortId }: { teams: Team[]; cohortId: string }) {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['trainees', cohortId],
    queryFn: () => traineesApi.listByCohort(cohortId, { limit: 100 }),
    enabled: !!cohortId,
  })
  const traineesRaw = data?.data
  const allTrainees: Trainee[] = Array.isArray(traineesRaw)
    ? (traineesRaw as Trainee[])
    : ((traineesRaw as { data?: Trainee[] })?.data ?? [])

  // Build set of assigned trainee IDs from current event's teams
  const assignedIds = new Set<string>()
  for (const team of teams) {
    for (const m of team.members) {
      const id = toIdString(m.trainee)
      if (id) assignedIds.add(id)
    }
  }

  const unassigned = allTrainees.filter(t => {
    const id = t.id || toIdString(t)
    return id && !assignedIds.has(id)
  })

  if (isLoading) {
    return (
      <div className="mt-8 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <UserX className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-bold text-amber-900">Without a Team</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (unassigned.length === 0) return null

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <UserX className="h-4 w-4 text-amber-600" />
          <h2 className="font-bold text-amber-900">Without a Team</h2>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {unassigned.length}
          </span>
        </div>
        <p className="text-xs text-amber-600">These trainees are not in any team for this event</p>
      </div>
      <div className="divide-y divide-amber-100">
        {unassigned.map(t => (
          <div
            key={t.id}
            onClick={() => navigate(`/trainees/${t.id}`)}
            className="flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors hover:bg-amber-100/60"
          >
            <AvatarWithFallback src={t.photo} name={`${t.firstName} ${t.lastName}`} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{t.firstName} {t.lastName}</p>
              <p className="text-xs text-slate-500">{t.country}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-amber-400" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function TeamsPage() {
  const { activeCohortId } = useCohortStore()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', activeCohortId],
    queryFn: () => eventsApi.listByCohort(activeCohortId!, { limit: 100 }),
    enabled: !!activeCohortId,
  })

  const eventsRaw = eventsData?.data
  const events: Event[] = Array.isArray(eventsRaw)
    ? (eventsRaw as Event[])
    : ((eventsRaw as { data?: Event[] })?.data ?? [])

  // Auto-select: prefer a session that's in_progress, then any session, then any event
  useEffect(() => {
    if (events.length === 0) return
    if (selectedEventId && events.some(e => e.id === selectedEventId)) return
    const sessions = events.filter(e => !!e.parentEvent)
    const preferred = sessions.find(e => e.status === 'in_progress') ?? sessions[0] ?? events.find(e => e.status === 'in_progress') ?? events[0]
    setSelectedEventId(preferred.id)
  }, [events, selectedEventId])

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams', selectedEventId],
    queryFn: () => teamsApi.listByEvent(selectedEventId!),
    enabled: !!selectedEventId,
  })

  const rawTeams = (teamsData?.data as { data?: Team[] | { teams?: Team[] } })?.data
  const allTeams: Team[] = Array.isArray(rawTeams)
    ? (rawTeams as Team[])
    : (rawTeams as { teams?: Team[] })?.teams ?? []

  const teams = allTeams.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.productIdea ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = allTeams.filter(t => t.status === 'active').length
  const completedCount = allTeams.filter(t => t.status === 'completed').length
  const totalMembers = allTeams.reduce((acc, t) => acc + t.members.length, 0)

  if (!activeCohortId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Network className="h-12 w-12 text-slate-200" />
        <div>
          <p className="font-semibold text-slate-700">No cohort selected</p>
          <p className="mt-1 text-sm text-slate-400">Select a cohort from the top bar to view its teams.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Teams</h1>
          {!teamsLoading && allTeams.length > 0 && (
            <p className="mt-0.5 text-sm text-slate-500">{allTeams.length} teams · {totalMembers} members</p>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={!selectedEventId}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-40"
          style={{ backgroundColor: TEAL }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = TEAL_DARK)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = TEAL)}
        >
          <Plus className="h-4 w-4" />
          New Team
        </button>
      </div>

      {/* Stats strip */}
      {!teamsLoading && allTeams.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Total Teams', value: allTeams.length, color: TEAL },
            { label: 'Active',      value: activeCount,    color: '#16a34a' },
            { label: 'Completed',   value: completedCount, color: '#2563eb' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-extrabold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Event tabs */}
      {eventsLoading && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-32 shrink-0 rounded-lg" />)}
        </div>
      )}

      {!eventsLoading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-20 text-center">
          <Network className="mb-4 h-7 w-7 text-slate-300" />
          <p className="font-semibold text-slate-700">No events yet</p>
          <p className="mt-1 text-sm text-slate-400">Create an event first to manage teams within it.</p>
        </div>
      )}

      {!eventsLoading && events.length > 0 && (
        <div className="mb-5">
          <EventTabs events={events} selectedEventId={selectedEventId} onSelect={setSelectedEventId} />
        </div>
      )}

      {/* Teams grid */}
      {selectedEventId && (
        <>
          {!teamsLoading && allTeams.length > 3 && (
            <div className="relative mb-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search teams by name or product idea…"
                className="h-10 w-full max-w-sm rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
              />
            </div>
          )}

          {teamsLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <TeamCardSkeleton key={i} />)}
            </div>
          )}

          {!teamsLoading && allTeams.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-20 text-center">
              <Network className="mb-4 h-7 w-7 text-slate-300" />
              <p className="font-semibold text-slate-700">No teams yet</p>
              <p className="mt-1 text-sm text-slate-400">Create the first team for this event.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-6 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: TEAL }}
              >
                <Plus className="h-4 w-4" /> New Team
              </button>
            </div>
          )}

          {!teamsLoading && allTeams.length > 0 && teams.length === 0 && (
            <p className="py-8 text-center text-sm italic text-slate-400">No teams match "{search}"</p>
          )}

          {!teamsLoading && teams.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map(team => <TeamCard key={team.id} team={team} />)}
            </div>
          )}

          {/* Unassigned trainees */}
          {!teamsLoading && activeCohortId && (
            <UnassignedTrainees key={selectedEventId} teams={allTeams} cohortId={activeCohortId} />
          )}
        </>
      )}

      {showCreate && selectedEventId && (
        <CreateTeamModal eventId={selectedEventId} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
