import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { eventsApi, type CreateEventPayload } from '@/api/events'
import { useCohortStore } from '@/store/cohort'
import { DatePicker } from '@/components/ui/DatePicker'
import type { Event, EventType } from '@/types'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-900'

const PROGRAM_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'startup_build', label: 'Startup Build' },
  { value: 'newco', label: 'NewCo' },
]

const SESSION_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'class_workshop', label: 'Class / Workshop' },
  { value: 'internal_review', label: 'Internal Review' },
  { value: 'demo_pitch_day', label: 'Demo / Pitch Day' },
  { value: 'other', label: 'Other' },
]

interface Props {
  onClose: () => void
  parentId?: string | null
  programs?: Event[]
}

export function CreateEventModal({ onClose, parentId, programs = [] }: Props) {
  const { activeCohortId } = useCohortStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const isSession = !!parentId

  const [name, setName] = useState('')
  const [type, setType] = useState<EventType | ''>('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)

  const typeOptions = isSession ? SESSION_TYPE_OPTIONS : PROGRAM_TYPE_OPTIONS

  // Find parent program name for context display
  const parentProgram = parentId
    ? programs.find((p) => p.id === parentId) ?? null
    : null

  const { mutate, isPending, error } = useMutation({
    mutationFn: (payload: CreateEventPayload) =>
      eventsApi.create(activeCohortId!, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['events', activeCohortId] })
      // For sessions: navigate directly to the session page so KPIs can be added immediately
      if (isSession) {
        const created = (response.data as { data?: { id?: string } })?.data
        if (created?.id) {
          onClose()
          navigate(`/events/${created.id}`)
          return
        }
      }
      onClose()
    },
  })

  const serverError =
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setDateError(null)

    if (!startDate || !endDate) {
      setDateError('Both start date and end date are required.')
      return
    }

    if (!type) return

    const payload: CreateEventPayload = {
      name,
      type,
      startDate,
      endDate,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(parentId ? { parentEvent: parentId } : {}),
    }

    mutate(payload)
  }

  const title = isSession ? 'Add Session' : 'Create Program'
  const submitLabel = isSession ? 'Add Session' : 'Create Program'
  const namePlaceholder = isSession
    ? 'e.g. Week 3 Workshop'
    : 'e.g. Startup Build Phase 1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="create-event-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Parent context banner (session mode only) */}
            {isSession && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="font-medium">Under: </span>
                {parentProgram ? (
                  <span className="font-semibold" style={{ color: TEAL }}>
                    {parentProgram.name}
                  </span>
                ) : (
                  <span className="italic text-slate-400">Program</span>
                )}
              </div>
            )}

            {serverError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {serverError}
              </div>
            )}

            {/* Name */}
            <div>
              <label className={labelCls}>
                Name <span className="text-red-400">*</span>
              </label>
              <input
                className={inputCls}
                placeholder={namePlaceholder}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Type */}
            <div>
              <label className={labelCls}>
                Type <span className="text-red-400">*</span>
              </label>
              <select
                className={inputCls}
                required
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
              >
                <option value="" disabled>
                  Select a type...
                </option>
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>
                Description{' '}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
                placeholder={isSession ? 'Brief description of this session...' : 'Brief description of this program...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>
                  Start Date <span className="text-red-400">*</span>
                </label>
                <DatePicker
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val)
                    setDateError(null)
                    if (endDate && val && endDate < val) setEndDate('')
                  }}
                  placeholder="Pick start date"
                />
              </div>
              <div>
                <label className={labelCls}>
                  End Date <span className="text-red-400">*</span>
                </label>
                <DatePicker
                  value={endDate}
                  onChange={(val) => {
                    setEndDate(val)
                    setDateError(null)
                  }}
                  placeholder="Pick end date"
                  disabled={startDate ? (d) => d < new Date(startDate) : undefined}
                />
              </div>
            </div>

            {dateError && (
              <p className="text-sm text-red-500">{dateError}</p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          {isSession && (
            <p className="text-xs text-slate-400">You'll configure KPIs & teams on the next page</p>
          )}
          <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-event-form"
            disabled={isPending}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
            onMouseEnter={(e) =>
              !isPending && (e.currentTarget.style.backgroundColor = TEAL_DARK)
            }
            onMouseLeave={(e) =>
              !isPending && (e.currentTarget.style.backgroundColor = TEAL)
            }
          >
            {isPending ? 'Saving...' : isSession ? 'Create & Configure →' : submitLabel}
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
