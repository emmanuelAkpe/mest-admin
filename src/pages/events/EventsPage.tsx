import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronDown, ChevronRight, ChevronUp, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { eventsApi } from '@/api/events'
import { useCohortStore } from '@/store/cohort'
import { Skeleton } from '@/components/ui/Skeleton'
import { CreateEventModal } from './CreateEventModal'
import type { Event, EventStatus } from '@/types'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

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

function getStatusBadge(status: EventStatus) {
  switch (status) {
    case 'not_started':
      return (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-500">
          Upcoming
        </span>
      )
    case 'in_progress':
      return (
        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: TEAL }}>
          Active
        </span>
      )
    case 'completed':
      return (
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase text-blue-600">
          Done
        </span>
      )
  }
}

function getStatusDotCls(status: EventStatus): string {
  switch (status) {
    case 'in_progress':
      return 'bg-[#0d968b]'
    case 'completed':
      return 'bg-blue-500'
    default:
      return 'bg-slate-300'
  }
}

function formatDateRange(start: string, end: string): string {
  return `${format(parseISO(start), 'MMM d')} – ${format(parseISO(end), 'MMM d, yyyy')}`
}

function getParentEventId(event: Event): string | null {
  if (!event.parentEvent) return null
  if (typeof event.parentEvent === 'string') return event.parentEvent
  return event.parentEvent.id
}

/* ── Skeleton components ── */
function SessionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5 px-4">
      <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
  )
}

function ProgramCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-l-4 border-l-[#0d968b] px-5 py-4 flex items-center gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <div className="border-t border-slate-100 px-4 pb-2 pt-1 divide-y divide-slate-50">
        {[1, 2].map((i) => <SessionRowSkeleton key={i} />)}
      </div>
    </div>
  )
}

/* ── Program card with expandable sessions ── */
function ProgramCard({
  program,
  sessions,
  onAddSession,
}: {
  program: Event
  sessions: Event[]
  onAddSession: (programId: string) => void
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div
        className="border-l-4 border-l-[#0d968b] flex cursor-pointer items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
        onClick={() => navigate(`/events/${program.id}`)}
      >
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 truncate">{program.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {formatEventType(program.type)}
            </span>
            <span className="text-xs text-slate-400">
              {formatDateRange(program.startDate, program.endDate)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge(program.status)}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          className="ml-1 rounded p-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Collapsible sessions */}
      {expanded && (
        <div className="border-t border-slate-100">
          {sessions.length === 0 ? (
            <div className="px-5 py-5 text-center">
              <p className="text-sm text-slate-400 italic">No sessions yet — add the first one</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => navigate(`/events/${session.id}`)}
                  className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${getStatusDotCls(session.status)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{session.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatEventType(session.type)} &middot; {formatDateRange(session.startDate, session.endDate)}
                    </p>
                  </div>
                  {getStatusBadge(session.status)}
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </div>
              ))}
            </div>
          )}

          {/* Add session button */}
          <div className="border-t border-slate-50 px-5 py-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddSession(program.id)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:border-[#0d968b] hover:text-[#0d968b] w-full justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Session
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   EventsPage
══════════════════════════════════════════════ */
export function EventsPage() {
  const { activeCohortId } = useCohortStore()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [createParentId, setCreateParentId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', activeCohortId],
    queryFn: () => eventsApi.listByCohort(activeCohortId!, { limit: 100 }),
    enabled: !!activeCohortId,
  })

  if (!activeCohortId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <CalendarDays className="h-12 w-12 text-slate-200" />
        <div>
          <p className="font-semibold text-slate-700">No cohort selected</p>
          <p className="mt-1 text-sm text-slate-400">
            Select a cohort from the top bar to view its events.
          </p>
        </div>
      </div>
    )
  }

  const allEvents: Event[] = (data?.data as { data?: Event[] })?.data ?? []

  const programs = allEvents.filter(
    (e) => (e.type === 'startup_build' || e.type === 'newco') && !e.parentEvent,
  )

  const sessions = allEvents.filter((e) => !!e.parentEvent)

  const standalone = allEvents.filter(
    (e) =>
      e.type !== 'startup_build' &&
      e.type !== 'newco' &&
      !e.parentEvent,
  )

  const totalSessions = sessions.length

  const getSessionsForProgram = (programId: string): Event[] =>
    sessions.filter((s) => getParentEventId(s) === programId)

  const openCreateSession = (programId: string) => {
    setCreateParentId(programId)
    setShowCreate(true)
  }

  const openCreateProgram = () => {
    setCreateParentId(null)
    setShowCreate(true)
  }

  /* Loading skeleton */
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="space-y-4">
          <ProgramCardSkeleton />
          <ProgramCardSkeleton />
        </div>
      </div>
    )
  }

  /* Empty state */
  if (!isLoading && !isError && allEvents.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
            <CalendarDays className="h-7 w-7 text-slate-300" />
          </div>
          <p className="text-lg font-bold text-slate-700">No programs yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Create your first program to get started with this cohort.
          </p>
          <button
            onClick={openCreateProgram}
            className="mt-6 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: TEAL }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TEAL_DARK)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL)}
          >
            <CalendarDays className="h-4 w-4" />
            Create Program
          </button>
        </div>
        {showCreate && (
          <CreateEventModal
            onClose={() => {
              setShowCreate(false)
              setCreateParentId(null)
            }}
            parentId={createParentId}
            programs={programs}
          />
        )}
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Events</h1>
          {isLoading ? (
            <Skeleton className="mt-1 h-4 w-40" />
          ) : (
            <p className="text-sm text-slate-500">
              {programs.length} program{programs.length !== 1 ? 's' : ''},{' '}
              {totalSessions} total session{totalSessions !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={openCreateProgram}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: TEAL }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TEAL_DARK)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL)}
        >
          <CalendarDays className="h-4 w-4" />
          Create Program
        </button>
      </div>

      {isError && (
        <p className="text-sm text-red-500">Failed to load events.</p>
      )}

      {/* Programs section */}
      {programs.length > 0 && (
        <section className="space-y-4">
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              sessions={getSessionsForProgram(program.id)}
              onAddSession={openCreateSession}
            />
          ))}
        </section>
      )}

      {/* Standalone section */}
      {standalone.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Other Events
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
            {standalone.map((event) => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{event.name}</p>
                  <p className="text-xs text-slate-400">
                    {formatEventType(event.type)} &middot;{' '}
                    {formatDateRange(event.startDate, event.endDate)}
                  </p>
                </div>
                <div className="hidden flex-col items-end gap-1 sm:flex">
                  {getStatusBadge(event.status)}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </div>
            ))}
          </div>
        </section>
      )}

      {showCreate && (
        <CreateEventModal
          onClose={() => {
            setShowCreate(false)
            setCreateParentId(null)
          }}
          parentId={createParentId}
          programs={programs}
        />
      )}
    </div>
  )
}
