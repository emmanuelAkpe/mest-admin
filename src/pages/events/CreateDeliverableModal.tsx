import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { deliverablesApi, type CreateDeliverablePayload } from '@/api/deliverables'
import { teamsApi } from '@/api/teams'
import type { SubmissionFileType, Team } from '@/types'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-900'

const ALL_TYPES: { value: SubmissionFileType; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'slides', label: 'Slides' },
  { value: 'document', label: 'Document' },
  { value: 'spreadsheet', label: 'Spreadsheet' },
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Image' },
  { value: 'link', label: 'Link' },
  { value: 'demo', label: 'Demo' },
]

interface Props {
  eventId: string
  onClose: () => void
}

export function CreateDeliverableModal({ eventId, onClose }: Props) {
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [acceptedTypes, setAcceptedTypes] = useState<SubmissionFileType[]>([])
  const [deadline, setDeadline] = useState('')

  const { data: teamsData } = useQuery({
    queryKey: ['event-teams', eventId],
    queryFn: () => teamsApi.listByEvent(eventId),
    staleTime: 60_000,
  })
  const rawTeams = (teamsData?.data as { data?: Team[] })?.data ?? []
  const teamCount: number = Array.isArray(rawTeams) ? rawTeams.length : 0

  const toggleType = (type: SubmissionFileType) => {
    setAcceptedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const { mutate, isPending, error } = useMutation({
    mutationFn: (payload: CreateDeliverablePayload) => deliverablesApi.create(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverables', eventId] })
      onClose()
    },
  })

  const serverError =
    (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
      ?.message ?? null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!acceptedTypes.length) return
    mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      acceptedTypes,
      deadline,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">New Deliverable</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="create-deliverable-form" onSubmit={handleSubmit} className="space-y-5">
            {serverError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</div>
            )}

            <div>
              <label className={labelCls}>Title <span className="text-red-400">*</span></label>
              <input
                className={inputCls}
                placeholder="e.g. Week 4 Demo Slides"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>
                Description <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
                placeholder="Brief instructions for teams..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Deadline <span className="text-red-400">*</span></label>
              <input
                type="datetime-local"
                className={inputCls}
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>
                Accepted file types <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_TYPES.map((t) => {
                  const active = acceptedTypes.includes(t.value)
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => toggleType(t.value)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                      style={
                        active
                          ? { backgroundColor: TEAL, color: '#fff' }
                          : { backgroundColor: '#f1f5f9', color: '#475569' }
                      }
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
              {acceptedTypes.length === 0 && (
                <p className="mt-1.5 text-xs text-red-400">Select at least one type.</p>
              )}
            </div>

            {teamCount > 0 && (
              <div className="rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-700">
                Will create submission links for <strong>{teamCount} team{teamCount !== 1 ? 's' : ''}</strong> in this event.
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-deliverable-form"
            disabled={isPending || acceptedTypes.length === 0}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
            onMouseEnter={(e) => !isPending && (e.currentTarget.style.backgroundColor = TEAL_DARK)}
            onMouseLeave={(e) => !isPending && (e.currentTarget.style.backgroundColor = TEAL)}
          >
            {isPending ? 'Creating…' : 'Create Deliverable'}
          </button>
        </div>
      </div>
    </div>
  )
}
