import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Clock, Film, FileText, Image, File, Table, Link2, Globe,
  Upload, Check, AlertCircle, Loader2, X, Plus, ExternalLink, Trash2,
  ShieldCheck, Mail,
} from 'lucide-react'
import { submissionLinksApi } from '@/api/submissionLinks'
import type { SubmissionLink, SubmissionFileType, SubmissionItem } from '@/types'

const TEAL = '#0d968b'

const FILE_TYPE_META: Record<SubmissionFileType, {
  label: string
  icon: React.ReactNode
  accept?: string
  color: string
  isUrl: boolean
  placeholder?: string
}> = {
  video:       { label: 'Video',      icon: <Film className="h-5 w-5" />,     accept: 'video/*,.mp4,.mov,.avi,.webm', color: '#7c3aed', isUrl: false },
  pdf:         { label: 'PDF',        icon: <FileText className="h-5 w-5" />, accept: '.pdf',                         color: '#dc2626', isUrl: false },
  image:       { label: 'Image',      icon: <Image className="h-5 w-5" />,    accept: 'image/*',                      color: '#0284c7', isUrl: false },
  slides:      { label: 'Slides/PPT', icon: <File className="h-5 w-5" />,    accept: '.ppt,.pptx,.key',               color: '#ea580c', isUrl: false },
  spreadsheet: { label: 'CSV/Excel',  icon: <Table className="h-5 w-5" />,   accept: '.csv,.xlsx,.xls',               color: '#16a34a', isUrl: false },
  document:    { label: 'Document',   icon: <FileText className="h-5 w-5" />, accept: '.doc,.docx',                   color: '#0f766e', isUrl: false },
  link:        { label: 'Link',       icon: <Link2 className="h-5 w-5" />,   color: '#0d968b', isUrl: true, placeholder: 'https://…' },
  demo:        { label: 'Demo',       icon: <Globe className="h-5 w-5" />,   color: '#8b5cf6', isUrl: true, placeholder: 'https://your-demo.com' },
}

type Step = 'loading' | 'email' | 'otp' | 'upload' | 'done' | 'expired' | 'error'

function DeadlineBanner({ deadline, expired }: { deadline: string; expired: boolean }) {
  const date = new Date(deadline)
  const formatted = date.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const ms = date.getTime() - Date.now()
  const days = Math.floor(ms / 86400000)
  const hrs = Math.floor((ms % 86400000) / 3600000)
  const remaining = expired ? 'Closed' : days > 0 ? `${days}d ${hrs}h remaining` : `${hrs}h remaining`

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${expired ? 'bg-red-50 text-red-700' : ms < 86400000 * 2 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
      <Clock className="h-4 w-4 shrink-0" />
      <span className="font-medium">{remaining}</span>
      <span className="text-xs opacity-70">· {formatted}</span>
    </div>
  )
}

// ── File/URL upload slot ────────────────────────────────────────────────────
function SubmissionSlot({
  fileType,
  accessToken,
  token,
  existingItems,
  onUploaded,
  onDeleted,
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
  const [urlValue, setUrlValue] = useState('')
  const [labelValue, setLabelValue] = useState('')
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  const typeItems = existingItems.filter((i) => i.fileType === fileType)

  const handleFile = async (file: File) => {
    setUploading(true)
    setErr('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('fileType', fileType)
      if (labelValue) fd.append('label', labelValue)
      const res = await submissionLinksApi.submit(token, accessToken, fd)
      const item = (res.data?.data as SubmissionItem | { data?: SubmissionItem })
      const resolved: SubmissionItem | null = item && 'id' in (item as object)
        ? (item as SubmissionItem)
        : (item as { data?: SubmissionItem })?.data ?? null
      if (resolved) onUploaded(resolved)
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
      const item = (res.data?.data as SubmissionItem | { data?: SubmissionItem })
      const resolved: SubmissionItem | null = item && 'id' in (item as object)
        ? (item as SubmissionItem)
        : (item as { data?: SubmissionItem })?.data ?? null
      if (resolved) {
        onUploaded(resolved)
        setUrlValue('')
        setLabelValue('')
      }
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: meta.color }}
        >
          {meta.icon}
        </span>
        <div>
          <p className="font-semibold text-slate-900">{meta.label}</p>
          {meta.accept && <p className="text-xs text-slate-400">{meta.accept}</p>}
        </div>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
          {typeItems.length} submitted
        </span>
      </div>

      {/* Existing submissions */}
      {typeItems.length > 0 && (
        <div className="space-y-1.5">
          {typeItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white text-[10px]" style={{ backgroundColor: meta.color }}>
                {meta.icon}
              </span>
              <p className="min-w-0 flex-1 truncate text-xs text-slate-700">{item.label || item.filename || item.url}</p>
              {(item.fileType === 'link' || item.fileType === 'demo') && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700" />
                </a>
              )}
              <button onClick={() => handleDelete(item.id)} className="shrink-0">
                <Trash2 className="h-3.5 w-3.5 text-slate-300 hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {meta.isUrl ? (
        <div className="space-y-2">
          <input
            type="text"
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            placeholder="Label (optional, e.g. 'Week 4 Demo')"
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
          />
          <div className="flex gap-2">
            <input
              type="url"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              placeholder={meta.placeholder}
              className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
            />
            <button
              onClick={handleLink}
              disabled={!urlValue.trim() || uploading}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: TEAL }}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={meta.accept}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-4 text-sm font-medium text-slate-500 transition-colors hover:border-[#0d968b] hover:bg-[#0d968b]/5 hover:text-[#0d968b] disabled:opacity-50"
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              : <><Upload className="h-4 w-4" /> Click to upload {meta.label}</>
            }
          </button>
        </>
      )}

      {err && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5" />{err}
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════
export function SubmitPage() {
  const { token } = useParams<{ token: string }>()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [submitterName, setSubmitterName] = useState('')
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [emailError, setEmailError] = useState('')
  const [otpError, setOtpError] = useState('')

  // Load link details
  const { data: linkData, isLoading, isError } = useQuery({
    queryKey: ['submit-link', token],
    queryFn: () => submissionLinksApi.getPublic(token!),
    enabled: !!token,
  })

  const linkRaw = linkData?.data
  const link: SubmissionLink | null =
    linkRaw && 'token' in (linkRaw as object)
      ? (linkRaw as SubmissionLink)
      : (linkRaw as { data?: SubmissionLink })?.data ?? null

  const isExpired = link ? new Date(link.deadline).getTime() < Date.now() : false

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
      const d = res.data?.data as { accessToken: string; submitterName: string }
      setAccessToken(d.accessToken)
      setSubmitterName(d.submitterName)
      setSubmissions(link?.submissions ?? [])
      setStep('upload')
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black text-white text-sm"
            style={{ backgroundColor: TEAL }}
          >
            M
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{link.title}</p>
            <p className="text-xs text-slate-400 truncate">{teamName}{eventName ? ` · ${eventName}` : ''}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 space-y-6">
        {/* Deadline */}
        <DeadlineBanner deadline={link.deadline} expired={isExpired} />

        {/* Description */}
        {link.description && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-sm leading-relaxed text-slate-700">{link.description}</p>
          </div>
        )}

        {/* Accepted types summary */}
        <div className="flex flex-wrap gap-2">
          {link.acceptedTypes.map((t) => {
            const meta = FILE_TYPE_META[t]
            return (
              <span
                key={t}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ backgroundColor: meta.color }}
              >
                {meta.icon}
                {meta.label}
              </span>
            )
          })}
        </div>

        {/* ── Expired ─────────────────────────────────────────────────────── */}
        {isExpired && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-6 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-red-300" />
            <p className="font-semibold text-red-700">Submissions Closed</p>
            <p className="mt-1 text-sm text-red-500">The deadline for this submission has passed.</p>
          </div>
        )}

        {/* ── Email step ──────────────────────────────────────────────────── */}
        {!isExpired && step === 'email' && (
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
              type="email"
              value={email}
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
              onClick={() => requestOtp()}
              disabled={!email.trim() || requestingOtp}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: TEAL }}
            >
              {requestingOtp ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Sending code…</span> : 'Continue'}
            </button>
          </div>
        )}

        {/* ── OTP step ────────────────────────────────────────────────────── */}
        {!isExpired && step === 'otp' && (
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
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
              onClick={() => verifyOtp()}
              disabled={otp.length < 6 || verifyingOtp}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: TEAL }}
            >
              {verifyingOtp ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</span> : 'Verify & Continue'}
            </button>
            <button
              onClick={() => requestOtp()}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-700"
            >
              Didn't receive it? Resend code
            </button>
          </div>
        )}

        {/* ── Upload step ─────────────────────────────────────────────────── */}
        {!isExpired && step === 'upload' && (
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium text-emerald-700">
                Identity verified{submitterName ? ` — Welcome, ${submitterName}` : ''}
              </p>
            </div>

            <p className="text-xs text-slate-400">
              You can add or remove submissions until the deadline passes. All changes are saved immediately.
            </p>

            {link.acceptedTypes.map((type) => (
              <SubmissionSlot
                key={type}
                fileType={type}
                accessToken={accessToken}
                token={token!}
                existingItems={submissions}
                onUploaded={(item) => setSubmissions((prev) => [...prev, item])}
                onDeleted={(id) => setSubmissions((prev) => prev.filter((s) => s.id !== id))}
              />
            ))}

            {submissions.length > 0 && (
              <div className="rounded-xl border border-[#0d968b]/20 bg-[#0d968b]/5 px-4 py-3 text-center">
                <Check className="mx-auto mb-1 h-5 w-5 text-[#0d968b]" />
                <p className="text-sm font-semibold" style={{ color: TEAL }}>
                  {submissions.length} item{submissions.length !== 1 ? 's' : ''} submitted
                </p>
                <p className="text-xs text-slate-500 mt-0.5">You can continue updating until the deadline.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
