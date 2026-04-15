import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Network, UserX, Send, Check, Loader2, UserPlus,
  ChevronRight, ChevronDown, GitBranch,
} from 'lucide-react'
import { teamsApi } from '@/api/teams'
import { eventsApi } from '@/api/events'
import { traineesApi } from '@/api/trainees'
import { useCohortStore } from '@/store/cohort'
import { AvatarWithFallback } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { CreateTeamModal } from './CreateTeamModal'
import type { Team, Trainee, Event } from '@/types'

const TEAL = '#0d968b'

const STATUS_COLOR: Record<Team['status'], string> = {
  active:      '#10b981',
  completed:   '#2563eb',
  not_started: '#94a3b8',
  dissolved:   '#ef4444',
}
const STATUS_LABEL: Record<Team['status'], string> = {
  active: 'Active', completed: 'Completed', not_started: 'Not started', dissolved: 'Dissolved',
}

type StatusFilter = 'all' | Team['status']

function getParentId(event: Event): string | null {
  if (!event.parentEvent) return null
  if (typeof event.parentEvent === 'string') return event.parentEvent
  return (event.parentEvent as { id: string }).id
}

/* ── Event selector dropdown ─────────────────────────────────────────────── */
function EventSelector({
  events,
  selectedId,
  onChange,
}: {
  events: Event[]
  selectedId: string | null
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = events.find(e => e.id === selectedId)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const programs = events.filter(e => (e.type === 'startup_build' || e.type === 'newco') && !e.parentEvent)
  const sessions = events.filter(e => !!e.parentEvent)
  const standalone = events.filter(e => e.type !== 'startup_build' && e.type !== 'newco' && !e.parentEvent)

  function getSessionsFor(programId: string) {
    return sessions.filter(s => getParentId(s) === programId)
  }

  const renderOption = (ev: Event) => {
    const isSelected = ev.id === selectedId
    const isLive = ev.status === 'in_progress'
    return (
      <button
        key={ev.id}
        onClick={() => { onChange(ev.id); setOpen(false) }}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: isLive ? TEAL : '#cbd5e1' }}
        />
        <span className={`flex-1 truncate ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
          {ev.name}
        </span>
        {isLive && (
          <span className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase"
            style={{ backgroundColor: `${TEAL}20`, color: TEAL }}>
            Live
          </span>
        )}
        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: TEAL }} />}
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
      >
        {selected?.status === 'in_progress' && (
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TEAL }} />
        )}
        <span className="max-w-[220px] truncate">{selected?.name ?? 'Select a session'}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="max-h-72 overflow-y-auto py-1">
            {/* Programs with their sessions */}
            {programs.map(program => {
              const childSessions = getSessionsFor(program.id)
              return (
                <div key={program.id}>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {program.name}
                  </p>
                  {childSessions.length > 0
                    ? childSessions.map(renderOption)
                    : renderOption(program)}
                </div>
              )
            })}
            {/* Standalone events */}
            {standalone.length > 0 && (
              <div>
                {programs.length > 0 && (
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Standalone Events
                  </p>
                )}
                {standalone.map(renderOption)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Member avatars ──────────────────────────────────────────────────────── */
function MemberAvatars({ members }: { members: Team['members'] }) {
  const show = members.slice(0, 4)
  const extra = members.length - 4
  return (
    <div className="flex items-center">
      {show.map((m, i) => {
        const t = m.trainee as Trainee
        const name = typeof t === 'object' ? `${t.firstName} ${t.lastName}` : '?'
        const photo = typeof t === 'object' ? t.photo : null
        return (
          <span key={typeof t === 'object' ? (t.id ?? `m${i}`) : `m${i}`}
            className={i > 0 ? '-ml-1.5' : ''}
            style={{ position: 'relative', zIndex: show.length - i }}>
            <AvatarWithFallback src={photo} name={name} size="sm" className="ring-2 ring-white" />
          </span>
        )
      })}
      {extra > 0 && (
        <span className="-ml-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white"
          style={{ backgroundColor: '#94a3b8', position: 'relative' }}>
          +{extra}
        </span>
      )}
    </div>
  )
}

/* ── Team row ────────────────────────────────────────────────────────────── */
function TeamRow({ team }: { team: Team }) {
  const navigate = useNavigate()
  const [linkSent, setLinkSent] = useState(false)

  const { mutate: sendLink, isPending: isSending } = useMutation({
    mutationFn: () => teamsApi.sendProfileLink(team.id),
    onSuccess: () => { setLinkSent(true); setTimeout(() => setLinkSent(false), 3000) },
  })

  const initials = team.name.slice(0, 2).toUpperCase()
  const color = STATUS_COLOR[team.status]

  return (
    <div
      onClick={() => navigate(`/teams/${team.id}`)}
      className="group flex cursor-pointer items-center gap-4 border-b border-slate-100 px-5 py-3.5 transition-colors last:border-b-0 hover:bg-slate-50"
    >
      {/* Team avatar */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
        style={{ backgroundColor: color + '22', color }}
      >
        {initials}
      </div>

      {/* Name + product idea */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-[#0d968b] transition-colors">
          {team.name}
        </p>
        <p className="truncate text-xs text-slate-400">
          {team.productIdea
            ? <span className="italic">{team.productIdea}</span>
            : <span>No product idea yet</span>}
        </p>
      </div>

      {/* Members */}
      <div className="hidden items-center gap-2 sm:flex">
        {team.members.length > 0
          ? <MemberAvatars members={team.members} />
          : <span className="text-xs text-slate-300">—</span>}
        <span className="w-12 text-right text-xs text-slate-400">
          {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* Pivots */}
      {team.pivots.length > 0 && (
        <div className="hidden items-center gap-1 text-xs text-slate-400 lg:flex">
          <GitBranch className="h-3.5 w-3.5" />
          {team.pivots.length}
        </div>
      )}

      {/* Status */}
      <div className="hidden shrink-0 items-center gap-1.5 md:flex">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-medium" style={{ color }}>{STATUS_LABEL[team.status]}</span>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => sendLink()}
          disabled={isSending || team.isDissolved}
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40"
          style={{ color: linkSent ? '#16a34a' : TEAL, backgroundColor: linkSent ? '#dcfce7' : `${TEAL}12` }}
        >
          {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : linkSent ? <Check className="h-3 w-3" /> : <Send className="h-3 w-3" />}
          <span className="hidden sm:inline">{linkSent ? 'Sent' : 'Send link'}</span>
        </button>
        <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-500" onClick={() => navigate(`/teams/${team.id}`)} />
      </div>
    </div>
  )
}

/* ── Skeleton row ────────────────────────────────────────────────────────── */
function TeamRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-3.5 last:border-b-0">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="hidden h-7 w-28 rounded-full sm:block" />
      <Skeleton className="hidden h-4 w-16 md:block" />
      <Skeleton className="h-7 w-20 rounded-md" />
    </div>
  )
}

/* ── Unassigned trainees ──────────────────────────────────────────────────── */
function toIdString(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  const o = val as Record<string, unknown>
  if (typeof o['id'] === 'string' && o['id']) return o['id']
  if (typeof o['_id'] === 'string' && o['_id']) return o['_id']
  if (typeof (val as { toString?: () => string })?.toString === 'function') {
    const s = (val as { toString: () => string }).toString()
    if (s.length === 24) return s
  }
  return ''
}

function UnassignedTrainees({
  teams, cohortId, eventId,
}: { teams: Team[]; cohortId: string; eventId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [newTeamForTrainee, setNewTeamForTrainee] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['trainees', cohortId],
    queryFn: () => traineesApi.listByCohort(cohortId, { limit: 100 }),
    enabled: !!cohortId,
  })
  const traineesRaw = data?.data
  const allTrainees: Trainee[] = Array.isArray(traineesRaw)
    ? (traineesRaw as Trainee[])
    : ((traineesRaw as { data?: Trainee[] })?.data ?? [])

  const assignedIds = new Set<string>()
  for (const team of teams)
    for (const m of team.members) {
      const id = toIdString(m.trainee)
      if (id) assignedIds.add(id)
    }

  const unassigned = allTrainees.filter(t => {
    const id = t.id || toIdString(t)
    return id && !assignedIds.has(id)
  })
  const assignableTeams = teams.filter(t => !t.isDissolved)

  const { mutate: addToTeam, isPending: isAdding } = useMutation({
    mutationFn: async ({ traineeId, team }: { traineeId: string; team: Team }) => {
      const existing = team.members.map(m => ({
        trainee: typeof m.trainee === 'object'
          ? ((m.trainee as { id?: string; _id?: string }).id || (m.trainee as { id?: string; _id?: string })._id || '')
          : m.trainee as string,
        roles: m.roles,
      }))
      await teamsApi.update(team.id, { members: [...existing, { trainee: traineeId, roles: [] }] })
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams', eventId] }); setOpenDropdown(null) },
  })

  if (isLoading || unassigned.length === 0) return null

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <UserX className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-slate-800">Without a team</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            {unassigned.length}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-amber-100 divide-y divide-slate-100">
          {unassigned.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
              <AvatarWithFallback src={t.photo} name={`${t.firstName} ${t.lastName}`} size="sm" />
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/trainees/${t.id}`)}>
                <p className="truncate text-sm font-medium text-slate-800">{t.firstName} {t.lastName}</p>
                <p className="text-xs text-slate-400">{t.country}</p>
              </div>
              <div className="relative shrink-0">
                <button
                  onClick={() => setOpenDropdown(openDropdown === t.id ? null : t.id)}
                  disabled={isAdding}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
                  style={{ color: TEAL, backgroundColor: `${TEAL}12` }}
                >
                  <UserPlus className="h-3 w-3" /> Assign
                </button>
                {openDropdown === t.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                    <div className="absolute right-0 bottom-full z-20 mb-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                      {assignableTeams.map(team => (
                        <button key={team.id} onClick={() => addToTeam({ traineeId: t.id, team })}
                          disabled={isAdding}
                          className="w-full truncate px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                          {team.name}
                        </button>
                      ))}
                      {assignableTeams.length > 0 && <div className="my-1 border-t border-slate-100" />}
                      <button onClick={() => { setOpenDropdown(null); setNewTeamForTrainee(t.id) }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"
                        style={{ color: TEAL }}>
                        <Plus className="h-3.5 w-3.5" /> New team
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {newTeamForTrainee && (() => {
        const takenIds = new Set<string>()
        teams.forEach(t => t.members.forEach(m => { const id = toIdString(m.trainee); if (id) takenIds.add(id) }))
        return (
          <CreateTeamModal
            eventId={eventId}
            initialMembers={[{ trainee: newTeamForTrainee, roles: [] }]}
            takenTraineeIds={takenIds}
            onClose={() => setNewTeamForTrainee(null)}
          />
        )
      })()}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export function TeamsPage() {
  const { activeCohortId } = useCohortStore()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', activeCohortId],
    queryFn: () => eventsApi.listByCohort(activeCohortId!, { limit: 100 }),
    enabled: !!activeCohortId,
  })

  const eventsRaw = eventsData?.data
  const events: Event[] = Array.isArray(eventsRaw)
    ? (eventsRaw as Event[])
    : ((eventsRaw as { data?: Event[] })?.data ?? [])

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

  const allTeams: Team[] = teamsData?.data?.data ?? []

  const filtered = allTeams.filter(t => {
    const matchSearch = !search
      || t.name.toLowerCase().includes(search.toLowerCase())
      || (t.productIdea ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    return matchSearch && matchStatus
  })

  const statusCounts = {
    active:      allTeams.filter(t => t.status === 'active').length,
    completed:   allTeams.filter(t => t.status === 'completed').length,
    not_started: allTeams.filter(t => t.status === 'not_started').length,
    dissolved:   allTeams.filter(t => t.status === 'dissolved').length,
  }
  const totalMembers = allTeams.reduce((acc, t) => acc + t.members.length, 0)

  if (!activeCohortId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Network className="h-10 w-10 text-slate-200" />
        <p className="font-semibold text-slate-700">No cohort selected</p>
        <p className="text-sm text-slate-400">Select a cohort from the top bar to view its teams.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">

      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">Teams</h1>

          {eventsLoading
            ? <Skeleton className="h-8 w-40 rounded-lg" />
            : events.length > 0 && (
              <EventSelector
                events={events}
                selectedId={selectedEventId}
                onChange={id => { setSelectedEventId(id); setSearch(''); setStatusFilter('all') }}
              />
            )}

          {!teamsLoading && allTeams.length > 0 && (
            <span className="text-sm text-slate-400">
              {allTeams.length} team{allTeams.length !== 1 ? 's' : ''} · {totalMembers} member{totalMembers !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {selectedEventId && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            <Plus className="h-4 w-4" /> New Team
          </button>
        )}
      </div>

      {/* ── No events ── */}
      {!eventsLoading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-20 text-center">
          <Network className="mb-4 h-7 w-7 text-slate-300" />
          <p className="font-semibold text-slate-700">No events yet</p>
          <p className="mt-1 text-sm text-slate-400">Create an event first to manage teams.</p>
        </div>
      )}

      {selectedEventId && (
        <>
          {/* ── Toolbar: search + status filter ── */}
          {(!teamsLoading && allTeams.length > 0) && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1" style={{ minWidth: '180px', maxWidth: '320px' }}>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search teams…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
                />
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                {(['all', 'active', 'completed', 'not_started', 'dissolved'] as StatusFilter[])
                  .filter(s => s === 'all' || statusCounts[s as Team['status']] > 0)
                  .map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
                      style={statusFilter === s
                        ? { backgroundColor: s === 'all' ? TEAL : STATUS_COLOR[s as Team['status']], color: '#fff' }
                        : { color: '#64748b' }}
                    >
                      {s === 'all' ? 'All' : STATUS_LABEL[s as Team['status']]}
                      {s !== 'all' && (
                        <span className="ml-1 opacity-70">{statusCounts[s as Team['status']]}</span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {teamsLoading && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {Array.from({ length: 5 }).map((_, i) => <TeamRowSkeleton key={i} />)}
            </div>
          )}

          {/* ── Empty state ── */}
          {!teamsLoading && allTeams.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-20 text-center">
              <Network className="mb-4 h-7 w-7 text-slate-300" />
              <p className="font-semibold text-slate-700">No teams yet</p>
              <p className="mt-1 text-sm text-slate-400">Create the first team for this session.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-5 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: TEAL }}
              >
                <Plus className="h-4 w-4" /> New Team
              </button>
            </div>
          )}

          {/* ── No filter match ── */}
          {!teamsLoading && allTeams.length > 0 && filtered.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-500">No teams match your filters</p>
              <button onClick={() => { setSearch(''); setStatusFilter('all') }}
                className="mt-2 text-sm font-semibold hover:underline" style={{ color: TEAL }}>
                Clear filters
              </button>
            </div>
          )}

          {/* ── Team list ── */}
          {!teamsLoading && filtered.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Column headers */}
              <div className="grid border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                style={{ gridTemplateColumns: '1fr 200px 120px 120px 100px' }}>
                <span>Team</span>
                <span className="hidden sm:block">Members</span>
                <span className="hidden lg:block">Pivots</span>
                <span className="hidden md:block">Status</span>
                <span />
              </div>
              {filtered.map(team => <TeamRow key={team.id} team={team} />)}
            </div>
          )}

          {/* ── Unassigned ── */}
          {!teamsLoading && activeCohortId && (
            <UnassignedTrainees key={selectedEventId} teams={allTeams} cohortId={activeCohortId} eventId={selectedEventId} />
          )}
        </>
      )}

      {showCreate && selectedEventId && (() => {
        const takenIds = new Set<string>()
        allTeams.forEach(t => t.members.forEach(m => { const id = toIdString(m.trainee); if (id) takenIds.add(id) }))
        return <CreateTeamModal eventId={selectedEventId} takenTraineeIds={takenIds} onClose={() => setShowCreate(false)} />
      })()}
    </div>
  )
}
