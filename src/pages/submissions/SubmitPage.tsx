import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Clock, Film, FileText, Image, File, Table, Link2, Globe,
  Upload, Check, AlertCircle, Loader2, X, Plus, ExternalLink, Trash2,
  ShieldCheck, Mail, Users, Sparkles, TrendingUp, Star, BarChart2,
} from 'lucide-react'
import { submissionLinksApi } from '@/api/submissionLinks'
import type {
  SubmissionLink, SubmissionFileType, SubmissionItem,
  PortalData, PortalLink, DeliverableTeamReview, TeamMemberRole, PortalEvalScores,
} from '@/types'

const TEAL = '#0d968b'

const FILE_TYPE_META: Record<SubmissionFileType, {
  label: string
  icon: React.ReactNode
  accept?: string
  color: string
  isUrl: boolean
  placeholder?: string
}> = {
  video:       { label: 'Video',      icon: <Film className="h-4 w-4" />,     accept: 'video/*,.mp4,.mov,.avi,.webm', color: '#7c3aed', isUrl: false },
  pdf:         { label: 'PDF',        icon: <FileText className="h-4 w-4" />, accept: '.pdf',                         color: '#dc2626', isUrl: false },
  image:       { label: 'Image',      icon: <Image className="h-4 w-4" />,    accept: 'image/*',                      color: '#0284c7', isUrl: false },
  slides:      { label: 'Slides/PPT', icon: <File className="h-4 w-4" />,    accept: '.ppt,.pptx,.key',               color: '#ea580c', isUrl: false },
  spreadsheet: { label: 'CSV/Excel',  icon: <Table className="h-4 w-4" />,   accept: '.csv,.xlsx,.xls',               color: '#16a34a', isUrl: false },
  document:    { label: 'Document',   icon: <FileText className="h-4 w-4" />, accept: '.doc,.docx',                   color: '#0f766e', isUrl: false },
  link:        { label: 'Link',       icon: <Link2 className="h-4 w-4" />,   color: '#0d968b', isUrl: true, placeholder: 'https://…' },
  demo:        { label: 'Demo',       icon: <Globe className="h-4 w-4" />,   color: '#8b5cf6', isUrl: true, placeholder: 'https://your-demo.com' },
}

const ROLE_LABELS: Partial<Record<TeamMemberRole, string>> = {
  team_lead: 'Lead', cto: 'CTO', product: 'Product', business: 'Business',
  design: 'Design', marketing: 'Marketing', finance: 'Finance', data_ai: 'Data/AI', presenter: 'Presenter',
}

type Step = 'email' | 'otp' | 'portal'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function DeadlineBadge({ deadline }: { deadline: string }) {
  const ms = new Date(deadline).getTime() - Date.now()
  const expired = ms < 0
  const days = Math.floor(ms / 86400000)
  const hrs = Math.floor((ms % 86400000) / 3600000)
  const label = expired ? 'Closed' : days > 0 ? `${days}d ${hrs}h left` : `${hrs}h left`
  const cls = expired
    ? 'bg-red-50 text-red-600'
    : ms < 86400000 * 2
    ? 'bg-amber-50 text-amber-700'
    : 'bg-emerald-50 text-emerald-700'
  return (
    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      <Clock className="h-3 w-3" />{label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    submitted:     { label: 'Submitted',     cls: 'bg-emerald-50 text-emerald-700' },
    pending:       { label: 'Pending',       cls: 'bg-amber-50 text-amber-700' },
    late:          { label: 'Late',          cls: 'bg-red-50 text-red-600' },
    not_submitted: { label: 'Not submitted', cls: 'bg-slate-100 text-slate-500' },
  }
  const cfg = map[status] ?? map.not_submitted
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>
}

function MemberChip({ firstName, lastName, roles }: { firstName?: string; lastName?: string; roles: TeamMemberRole[] }) {
  const initials = `${(firstName ?? '')[0] ?? ''}${(lastName ?? '')[0] ?? ''}`.toUpperCase() || '?'
  const role = roles[0] ? (ROLE_LABELS[roles[0]] ?? roles[0]) : ''
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-800 truncate">{firstName ?? ''} {lastName ?? ''}</p>
        {role && <p className="text-[10px] text-slate-400">{role}</p>}
      </div>
    </div>
  )
}

function ReviewCard({ review }: { review: DeliverableTeamReview }) {
  if (review.noContentWarning) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-700">No reviewable content found — AI review could not be generated for this submission.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-[#0d968b]/20 bg-[#0d968b]/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: TEAL }} />
          <p className="text-sm font-semibold" style={{ color: TEAL }}>AI Feedback</p>
        </div>
        {review.score != null && (
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-current" style={{ color: TEAL }} />
            <span className="text-sm font-bold" style={{ color: TEAL }}>{review.score}/10</span>
          </div>
        )}
      </div>
      {review.summary && (
        <p className="text-sm text-slate-700 leading-relaxed">{review.summary}</p>
      )}
      {review.strengths.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Strengths</p>
          <div className="flex flex-wrap gap-1.5">
            {review.strengths.map((s, i) => (
              <span key={i} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">{s}</span>
            ))}
          </div>
        </div>
      )}
      {review.improvements.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">To Improve</p>
          <div className="flex flex-wrap gap-1.5">
            {review.improvements.map((s, i) => (
              <span key={i} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">{s}</span>
            ))}
          </div>
        </div>
      )}
      {review.redFlags.length > 0 && (
        <div className="rounded-lg bg-red-50 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-red-500">Flags</p>
          <ul className="space-y-0.5">
            {review.redFlags.map((f, i) => (
              <li key={i} className="text-xs text-red-600">· {f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function EvalScoresCard({ scores }: { scores: PortalEvalScores }) {
  const pct = Math.min(100, (scores.overallAvg / 10) * 100)
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-slate-400" />
          <p className="text-sm font-bold text-slate-900">Evaluation Results</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-extrabold" style={{ color: TEAL }}>{scores.overallAvg.toFixed(1)}</span>
          <span className="text-xs text-slate-400">/ 10 overall</span>
        </div>
      </div>

      {/* Overall score bar */}
      <div>
        <div className="h-2 w-full rounded-full bg-slate-100">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: TEAL }}
          />
        </div>
      </div>

      {/* Per-KPI breakdown */}
      {scores.kpis.length > 1 && (
        <div className="space-y-2.5">
          {scores.kpis.map((kpi, i) => (
            <div key={i} className="flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-xs text-slate-600">{kpi.kpiName}</p>
              <div className="flex w-32 items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, (kpi.avgScore / 10) * 100)}%`, backgroundColor: TEAL }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-semibold text-slate-700">{kpi.avgScore.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Submission slot (upload / link input) ───────────────────────────────────
function SubmissionSlot({
  fileType, accessToken, token, existingItems, onUploaded, onDeleted,
}: {
  fileType: SubmissionFileType
  accessToken: string
  token: string
  existingItems: SubmissionItem[]
  onUploaded: (item: SubmissionItem) => void
  onDeleted: (id: string) => void
}) {
  const meta = FILE_TYPE_META[fileType]
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [urlValue, setUrlValue] = useState('')
  const [labelValue, setLabelValue] = useState('')
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  const typeItems = existingItems.filter((i) => i.fileType === fileType)

  const commitFile = async () => {
    if (!stagedFile) return
    setUploading(true)
    setErr('')
    try {
      const fd = new FormData()
      fd.append('file', stagedFile)
      fd.append('fileType', fileType)
      if (labelValue.trim()) fd.append('label', labelValue.trim())
      const res = await submissionLinksApi.submit(token, accessToken, fd)
      const raw = res.data?.data as SubmissionItem | { data?: SubmissionItem }
      const item = raw && 'id' in (raw as object) ? (raw as SubmissionItem) : (raw as { data?: SubmissionItem })?.data ?? null
      if (item) { onUploaded(item); setStagedFile(null); setLabelValue('') }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      setErr(msg ?? 'Upload failed. Please try again.')
    }
    setUploading(false)
  }

  const handleLink = async () => {
    if (!urlValue.trim()) return
    setUploading(true)
    setErr('')
    try {
      const res = await submissionLinksApi.submitLink(token, accessToken, {
        fileType: fileType as 'link' | 'demo',
        url: urlValue.trim(),
        label: labelValue.trim() || undefined,
      })
      const raw = res.data?.data as SubmissionItem | { data?: SubmissionItem }
      const item = raw && 'id' in (raw as object) ? (raw as SubmissionItem) : (raw as { data?: SubmissionItem })?.data ?? null
      if (item) { onUploaded(item); setUrlValue(''); setLabelValue('') }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      setErr(msg ?? 'Failed to submit link.')
    }
    setUploading(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await submissionLinksApi.deleteSubmission(token, accessToken, id)
      onDeleted(id)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-2">
      {/* Existing items */}
      {typeItems.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white" style={{ backgroundColor: meta.color }}>
            {meta.icon}
          </span>
          <p className="min-w-0 flex-1 truncate text-xs text-slate-700">{item.label || item.filename || item.url}</p>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-slate-700" title="Open">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button onClick={() => handleDelete(item.id)} className="shrink-0 text-slate-300 hover:text-red-400" title="Remove">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {/* Input */}
      {meta.isUrl ? (
        <div className="space-y-2">
          <input
            type="text" value={labelValue} onChange={(e) => setLabelValue(e.target.value)}
            placeholder="Label (optional)"
            className="h-8 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
          />
          <div className="flex gap-2">
            <input
              type="url" value={urlValue} onChange={(e) => setUrlValue(e.target.value)}
              placeholder={meta.placeholder}
              className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
            />
            <button
              onClick={handleLink} disabled={!urlValue.trim() || uploading}
              className="flex shrink-0 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: TEAL }}
            >
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Add
            </button>
          </div>
        </div>
      ) : stagedFile ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: meta.color }}>
              {meta.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">{stagedFile.name}</p>
              <p className="text-[10px] text-slate-400">{formatBytes(stagedFile.size)}</p>
            </div>
            <button onClick={() => { setStagedFile(null); setLabelValue(''); setErr('') }} className="shrink-0 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text" value={labelValue} onChange={(e) => setLabelValue(e.target.value)}
            placeholder="Label (optional)"
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setStagedFile(null); setLabelValue('') }}
              className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              Change file
            </button>
            <button
              onClick={commitFile} disabled={uploading}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: TEAL }}
            >
              {uploading ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</> : <><Upload className="h-3 w-3" /> Submit</>}
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef} type="file" accept={meta.accept} className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) { setStagedFile(e.target.files[0]); setErr('') }; e.target.value = '' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-3 text-xs font-medium text-slate-500 transition-colors hover:border-[#0d968b] hover:bg-[#0d968b]/5 hover:text-[#0d968b]"
          >
            <Upload className="h-3.5 w-3.5" /> Choose {meta.label} file
          </button>
        </>
      )}

      {err && <p className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle className="h-3.5 w-3.5" />{err}</p>}
    </div>
  )
}

// ── Deliverable card (inside portal) ────────────────────────────────────────
function DeliverableCard({
  link, activeToken, accessToken, activeSubmissions, onUploaded, onDeleted,
}: {
  link: PortalLink
  activeToken: string
  accessToken: string
  activeSubmissions: SubmissionItem[]
  onUploaded: (item: SubmissionItem) => void
  onDeleted: (id: string) => void
}) {
  const isActive = link.isActive
  const isExpired = new Date(link.deadline).getTime() < Date.now()
  const submissions = isActive ? activeSubmissions : link.submissions
  const submittedCount = submissions.length

  return (
    <div className={`rounded-xl border bg-white ${isActive ? 'border-[#0d968b]/30 ring-1 ring-[#0d968b]/20' : 'border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-slate-900">{link.title}</h3>
            {isActive && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ backgroundColor: TEAL }}>
                Current
              </span>
            )}
            <StatusBadge status={link.status} />
          </div>
          {link.description && <p className="text-xs text-slate-500 leading-relaxed">{link.description}</p>}
        </div>
        <DeadlineBadge deadline={link.deadline} />
      </div>

      {/* Accepted types */}
      <div className="flex flex-wrap gap-1.5 px-5 pb-3">
        {link.acceptedTypes.map((t) => {
          const meta = FILE_TYPE_META[t]
          return (
            <span key={t} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: meta.color }}>
              {meta.icon} {meta.label}
            </span>
          )
        })}
      </div>

      <div className="border-t border-slate-100 px-5 py-4 space-y-3">
        {isActive && !isExpired ? (
          <>
            {link.acceptedTypes.map((type) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded text-white" style={{ backgroundColor: FILE_TYPE_META[type].color }}>
                    {FILE_TYPE_META[type].icon}
                  </span>
                  <p className="text-xs font-semibold text-slate-700">{FILE_TYPE_META[type].label}</p>
                </div>
                <SubmissionSlot
                  fileType={type} accessToken={accessToken} token={activeToken}
                  existingItems={activeSubmissions}
                  onUploaded={onUploaded} onDeleted={onDeleted}
                />
              </div>
            ))}
            {submittedCount > 0 && (
              <p className="text-center text-xs text-slate-400">
                {submittedCount} item{submittedCount !== 1 ? 's' : ''} submitted · You can update until the deadline
              </p>
            )}
          </>
        ) : isActive && isExpired ? (
          <p className="text-center text-xs text-slate-400 py-1">Submissions closed — deadline has passed.</p>
        ) : submissions.length > 0 ? (
          <div className="space-y-1.5">
            {submissions.map((item) => {
              const meta = FILE_TYPE_META[item.fileType]
              return (
                <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white" style={{ backgroundColor: meta.color }}>
                    {meta.icon}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-xs text-slate-700">{item.label || item.filename || item.url}</p>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-slate-700">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">No submissions yet</p>
            {!isExpired && (
              <a
                href={`/submit/${link.token}`}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                style={{ backgroundColor: TEAL }}
              >
                Open submission
              </a>
            )}
          </div>
        )}
      </div>

      {/* AI Review */}
      {link.teamReview && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">AI Review</p>
          </div>
          <ReviewCard review={link.teamReview} />
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════
export function SubmitPage() {
  const { token } = useParams<{ token: string }>()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [activeSubmissions, setActiveSubmissions] = useState<SubmissionItem[]>([])
  const [emailError, setEmailError] = useState('')
  const [otpError, setOtpError] = useState('')

  // Load link details (for header before auth)
  const { data: linkData, isLoading, isError } = useQuery({
    queryKey: ['submit-link', token],
    queryFn: () => submissionLinksApi.getPublic(token!),
    enabled: !!token,
  })

  // Load portal once authenticated
  const { data: portalResp, isLoading: portalLoading } = useQuery({
    queryKey: ['portal', token, accessToken],
    queryFn: () => submissionLinksApi.getTeamPortal(token!, accessToken),
    enabled: !!accessToken && !!token,
  })

  const link: SubmissionLink | null = linkData?.data?.data ?? null
  const portal: PortalData | null = portalResp?.data?.data ?? null

  // Seed active submissions from portal once loaded
  useEffect(() => {
    if (portal) {
      const active = portal.submissionLinks.find((l) => l.isActive)
      if (active) setActiveSubmissions(active.submissions)
    }
  }, [portal])

  // Request OTP
  const { mutate: requestOtp, isPending: requestingOtp } = useMutation({
    mutationFn: () => submissionLinksApi.requestAccess(token!, email.trim()),
    onSuccess: () => { setStep('otp'); setEmailError('') },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      setEmailError(msg ?? 'Email not found. Make sure you use your registered team email.')
    },
  })

  // Verify OTP
  const { mutate: verifyOtp, isPending: verifyingOtp } = useMutation({
    mutationFn: () => submissionLinksApi.verifyAccess(token!, email.trim(), otp.trim()),
    onSuccess: (res) => {
      const d = res.data?.data as { accessToken: string; submitterEmail: string }
      setAccessToken(d.accessToken)
      setStep('portal')
      setOtpError('')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      setOtpError(msg ?? 'Incorrect or expired code. Please try again.')
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (isError || !link) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-300" />
        <p className="text-lg font-semibold text-slate-700">Link not found</p>
        <p className="mt-1 text-sm text-slate-400">This submission link doesn't exist or has been removed.</p>
      </div>
    )
  }

  const teamName = typeof link.team === 'object' ? (link.team as { name: string }).name : 'Your Team'
  const eventName = typeof link.event === 'object' ? (link.event as { name: string }).name : ''
  const isExpired = new Date(link.deadline).getTime() < Date.now()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black text-white text-sm" style={{ backgroundColor: TEAL }}>
            M
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {portal ? portal.team.name : teamName}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {portal ? portal.event.name : eventName || 'Submission Portal'}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-5">

        {/* ── Email step ──────────────────────────────────────────────────── */}
        {step === 'email' && (
          <>
            {isExpired && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">
                  <span className="font-semibold">Submissions closed.</span> Verify your email to view your team's submission history.
                </p>
              </div>
            )}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Verify your identity</p>
                  <p className="text-xs text-slate-400">Enter your team email to receive a one-time code</p>
                </div>
              </div>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && requestOtp()}
                placeholder="your@email.com"
                className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
              />
              {emailError && (
                <p className="flex items-start gap-1.5 text-sm text-red-500">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{emailError}
                </p>
              )}
              <button
                onClick={() => requestOtp()} disabled={!email.trim() || requestingOtp}
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: TEAL }}
              >
                {requestingOtp
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending code…</span>
                  : 'Continue'}
              </button>
            </div>
          </>
        )}

        {/* ── OTP step ────────────────────────────────────────────────────── */}
        {step === 'otp' && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <ShieldCheck className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Enter your code</p>
                <p className="text-xs text-slate-400">
                  We sent a 6-digit code to <span className="font-semibold text-slate-600">{email}</span>
                </p>
              </div>
              <button onClick={() => setStep('email')} className="ml-auto rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              type="text" inputMode="numeric" maxLength={6}
              value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
              placeholder="000000"
              className="h-14 w-full rounded-lg border border-slate-200 px-3 text-center text-2xl font-bold tracking-widest outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
            />
            {otpError && (
              <p className="flex items-start gap-1.5 text-sm text-red-500">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{otpError}
              </p>
            )}
            <button
              onClick={() => verifyOtp()} disabled={otp.length < 6 || verifyingOtp}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: TEAL }}
            >
              {verifyingOtp
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</span>
                : 'Verify & Continue'}
            </button>
            <button onClick={() => requestOtp()} className="w-full text-center text-xs text-slate-400 hover:text-slate-700">
              Didn't receive it? Resend code
            </button>
          </div>
        )}

        {/* ── Portal step ─────────────────────────────────────────────────── */}
        {step === 'portal' && (
          <>
            {portalLoading || !portal ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
              </div>
            ) : (
              <>
                {/* Team card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{portal.team.name}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{portal.event.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1">
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">Verified</span>
                    </div>
                  </div>

                  {(portal.team.productIdea || portal.team.marketFocus) && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {portal.team.productIdea && (
                        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Product</p>
                          <p className="text-xs text-slate-700">{portal.team.productIdea}</p>
                        </div>
                      )}
                      {portal.team.marketFocus && (
                        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Market</p>
                          <p className="text-xs text-slate-700">{portal.team.marketFocus}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {portal.team.members.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Team Members</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {portal.team.members.map((m, i) => (
                          <MemberChip key={i} firstName={m.firstName} lastName={m.lastName} roles={m.roles} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Deliverables */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Deliverables</p>
                  <div className="space-y-4">
                    {portal.submissionLinks.map((pLink) => (
                      <DeliverableCard
                        key={pLink.id}
                        link={pLink}
                        activeToken={token!}
                        accessToken={accessToken}
                        activeSubmissions={activeSubmissions}
                        onUploaded={(item) => setActiveSubmissions((prev) => [...prev, item])}
                        onDeleted={(id) => setActiveSubmissions((prev) => prev.filter((s) => s.id !== id))}
                      />
                    ))}
                    {portal.submissionLinks.length === 0 && (
                      <p className="text-center text-sm text-slate-400 py-8">No deliverables assigned yet.</p>
                    )}
                  </div>
                </div>

                {/* Evaluation scores */}
                {portal.evaluationScores && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Your Scores</p>
                    <EvalScoresCard scores={portal.evaluationScores} />
                  </div>
                )}

                {/* Footer */}
                <p className="text-center text-xs text-slate-400 pb-4">
                  Signed in as <span className="font-medium text-slate-500">{portal.submitterEmail}</span>
                </p>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
