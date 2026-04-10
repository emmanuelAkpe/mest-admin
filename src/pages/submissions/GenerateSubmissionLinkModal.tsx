import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { X, Film, FileText, Image, File, Table, Link2, Globe, Check, Copy, CheckCheck, ChevronDown } from 'lucide-react'
import { eventsApi } from '@/api/events'
import { submissionLinksApi } from '@/api/submissionLinks'
import type { Team, Event, SubmissionFileType, SubmissionLink } from '@/types'

const TEAL = '#0d968b'

const FILE_TYPES: { type: SubmissionFileType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'video',       label: 'Video',      icon: <Film className="h-4 w-4" />,     desc: 'MP4, MOV, AVI' },
  { type: 'pdf',         label: 'PDF',        icon: <FileText className="h-4 w-4" />, desc: 'PDF documents' },
  { type: 'image',       label: 'Image',      icon: <Image className="h-4 w-4" />,    desc: 'JPG, PNG, WebP' },
  { type: 'slides',      label: 'Slides/PPT', icon: <File className="h-4 w-4" />,     desc: 'PPT, PPTX, Keynote' },
  { type: 'spreadsheet', label: 'CSV/Excel',  icon: <Table className="h-4 w-4" />,    desc: 'CSV, XLSX, XLS' },
  { type: 'document',    label: 'Document',   icon: <FileText className="h-4 w-4" />, desc: 'DOC, DOCX' },
  { type: 'link',        label: 'Link',       icon: <Link2 className="h-4 w-4" />,    desc: 'Any URL' },
  { type: 'demo',        label: 'Demo',       icon: <Globe className="h-4 w-4" />,    desc: 'Deployed app / demo URL' },
]

interface Props {
  team: Team
  onClose: () => void
  onSuccess: () => void
}

export function GenerateSubmissionLinkModal({ team, onClose, onSuccess }: Props) {
  const parentEventId = typeof team.event === 'object'
    ? (team.event.id || (team.event as unknown as { _id?: string })._id || '')
    : team.event

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedEventId, setSelectedEventId] = useState<string>(parentEventId ?? '')
  const [acceptedTypes, setAcceptedTypes] = useState<SubmissionFileType[]>([])
  const [deadline, setDeadline] = useState('')
  const [generatedLink, setGeneratedLink] = useState<SubmissionLink | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch sessions under the parent event
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions', parentEventId],
    queryFn: () => eventsApi.listByParent(parentEventId!),
    enabled: !!parentEventId,
  })
  const sessionsRaw = sessionsData?.data
  const sessions: Event[] = Array.isArray(sessionsRaw)
    ? (sessionsRaw as Event[])
    : (sessionsRaw as { data?: Event[] })?.data ?? []

  // Include the parent event itself as an option
  const parentEvent = typeof team.event === 'object' ? team.event as Event : null
  const eventOptions: Event[] = [
    ...(parentEvent ? [parentEvent] : []),
    ...sessions,
  ]

  const toggleType = (t: SubmissionFileType) =>
    setAcceptedTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])

  const { mutate, isPending, error } = useMutation({
    mutationFn: () =>
      submissionLinksApi.create({
        teamId: team.id,
        eventId: selectedEventId,
        title: title.trim(),
        description: description.trim() || undefined,
        acceptedTypes,
        deadline,
      }),
    onSuccess: (res) => {
      const link = (res.data?.data as SubmissionLink | { data?: SubmissionLink })
      const resolved: SubmissionLink | null =
        link && 'token' in (link as object)
          ? (link as SubmissionLink)
          : (link as { data?: SubmissionLink })?.data ?? null
      setGeneratedLink(resolved)
      onSuccess()
    },
  })

  const serverError =
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? null

  const submissionUrl = generatedLink
    ? `${window.location.origin}/submit/${generatedLink.token}`
    : ''

  const copyLink = () => {
    navigator.clipboard.writeText(submissionUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const canSubmit = title.trim() && selectedEventId && acceptedTypes.length > 0 && deadline

  // ── Success screen ─────────────────────────────────────────────────────────
  if (generatedLink) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Link Generated!</h2>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-center rounded-full bg-emerald-50 h-16 w-16 mx-auto">
              <Check className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-900">{generatedLink.title}</p>
              <p className="text-sm text-slate-500 mt-1">Share this link with the team to collect submissions</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="min-w-0 flex-1 truncate text-sm font-mono text-slate-700">{submissionUrl}</p>
              <button
                onClick={copyLink}
                className="shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all"
                style={copied ? { backgroundColor: '#f0fdf4', color: '#16a34a' } : { backgroundColor: TEAL, color: 'white' }}
              >
                {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 space-y-1 text-xs text-slate-600">
              <p><span className="font-semibold">Deadline:</span> {new Date(generatedLink.deadline).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <p><span className="font-semibold">Accepts:</span> {generatedLink.acceptedTypes.map((t) => FILE_TYPES.find((f) => f.type === t)?.label).join(', ')}</p>
              <p><span className="font-semibold">Team:</span> {team.name}</p>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: TEAL }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Generate Submission Link</h2>
            <p className="text-xs text-slate-400">{team.name}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {serverError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Request Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Week 4 Demo Video, Final Pitch Deck…"
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Description <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional instructions or context for the team…"
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
            />
          </div>

          {/* Session selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              For Session / Event *
            </label>
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
              >
                <option value="">Select a session…</option>
                {eventOptions.map((ev) => {
                  const evId = ev.id || (ev as unknown as { _id?: string })._id || ''
                  return (
                    <option key={evId} value={evId}>
                      {ev.name}{sessions.includes(ev) ? '' : ' (Program)'}
                    </option>
                  )
                })}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Accepted types */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              What can they submit? *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FILE_TYPES.map(({ type, label, icon, desc }) => {
                const active = acceptedTypes.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left text-sm font-medium transition-all ${
                      active
                        ? 'border-[#0d968b] bg-[#0d968b]/5 text-[#0d968b]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                        active ? 'bg-[#0d968b] text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight">{label}</p>
                      <p className={`text-[10px] leading-tight ${active ? 'text-[#0d968b]/70' : 'text-slate-400'}`}>{desc}</p>
                    </div>
                    {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-[#0d968b]" />}
                  </button>
                )
              })}
            </div>
            {acceptedTypes.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-500">Select at least one type.</p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Submission Deadline *
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => mutate()}
            disabled={!canSubmit || isPending}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: TEAL }}
          >
            {isPending ? 'Generating…' : 'Generate Link'}
          </button>
        </div>
      </div>
    </div>
  )
}
