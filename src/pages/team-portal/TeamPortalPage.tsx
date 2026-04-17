import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Target, Sparkles, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronUp,
  LogOut, BookOpen, GitBranch, Star, TrendingUp, MessageSquare, Loader2,
  CalendarDays, Upload, Link2, RefreshCw,
} from 'lucide-react'
import { teamPortalApi } from '@/api/teamPortal'
import type { TeamPortalData, TeamPortalEvent, TeamPortalDeliverable, TeamPortalEvaluator } from '@/api/teamPortal'

const TEAL = '#0d968b'
const SESSION_KEY = 'teamPortalSession'

type Step = 'email' | 'otp' | 'portal'

// ── Auth steps ────────────────────────────────────────────────────────────────

function EmailStep({ onNext }: { onNext: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await teamPortalApi.requestOtp(email.trim().toLowerCase())
      onNext(email.trim().toLowerCase())
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="mb-6 text-center text-sm text-slate-500">
        Enter your MEST email address to access your team portal.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email" placeholder="you@example.com" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={loading || !email.trim()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: TEAL }}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue →'}
        </button>
      </form>
    </div>
  )
}

function OtpStep({ email, onSuccess }: { email: string; onSuccess: (token: string) => void }) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await teamPortalApi.verifyOtp(email, otp.trim())
      const token = (res.data as { data?: { accessToken?: string } })?.data?.accessToken
      if (!token) throw new Error('No token returned')
      localStorage.setItem(SESSION_KEY, token)
      onSuccess(token)
    } catch {
      setError('Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="mb-1 text-center text-sm text-slate-700">Check your inbox for a 6-digit code sent to</p>
      <p className="mb-6 text-center text-sm font-semibold text-slate-900">{email}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text" inputMode="numeric" maxLength={6} placeholder="000000" value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required
          className="h-14 w-full rounded-xl border border-slate-200 px-4 text-center text-2xl font-bold tracking-[0.3em] text-slate-900 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button type="submit" disabled={loading || otp.length < 6}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: TEAL }}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify Code'}
        </button>
      </form>
    </div>
  )
}

// ── Auth wrapper ──────────────────────────────────────────────────────────────

function AuthGate({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: TEAL }}>
          M
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Team Portal</h1>
        <p className="mt-1 text-xs text-slate-400">MEST Africa</p>
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {step === 'email'
          ? <EmailStep onNext={(e) => { setEmail(e); setStep('otp') }} />
          : <OtpStep email={email} onSuccess={onAuthenticated} />}
      </div>
    </div>
  )
}

// ── Portal sections ───────────────────────────────────────────────────────────

const EVENT_TYPE_LABELS: Record<string, string> = {
  startup_build: 'Startup Build', newco: 'NewCo', class_workshop: 'Workshop',
  internal_review: 'Internal Review', demo_pitch_day: 'Demo Pitch Day', other: 'Event',
}

const READINESS_META: Record<string, { label: string; cls: string }> = {
  investor_ready: { label: 'Investor Ready', cls: 'bg-emerald-50 text-emerald-700' },
  near_ready:     { label: 'Near Ready',     cls: 'bg-teal-50 text-teal-700' },
  needs_work:     { label: 'Needs Work',     cls: 'bg-amber-50 text-amber-700' },
  early_stage:    { label: 'Early Stage',    cls: 'bg-slate-100 text-slate-600' },
}

const PIVOT_LABELS: Record<string, string> = {
  product_idea: 'Product Idea', target_market: 'Target Market',
  business_model: 'Business Model', technical_approach: 'Technical Approach', multiple: 'Multiple Changes',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ScoreBar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100)
  const color = pct >= 70 ? '#0d968b' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="shrink-0 text-xs font-bold" style={{ color }}>{score}/{max}</span>
    </div>
  )
}

function DeliverableCard({ d, token, onRefresh }: { d: TeamPortalDeliverable; token: string; onRefresh: () => void }) {
  const [showUpload, setShowUpload] = useState(false)
  const [urlMode, setUrlMode] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [urlFileType, setUrlFileType] = useState('link')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const isPast = new Date(d.deadline) < new Date()
  const msLeft = new Date(d.deadline).getTime() - Date.now()
  const hoursLeft = Math.floor(msLeft / 3600000)
  const urgent = !isPast && msLeft > 0 && msLeft <= 48 * 3600 * 1000

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await teamPortalApi.submitDeliverable(token, d.id, fd)
      onRefresh(); setShowUpload(false)
    } catch { setError('Upload failed. Please try again.') }
    finally { setUploading(false) }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setUploading(true)
    try {
      const fd = new FormData()
      fd.append('url', urlValue)
      fd.append('fileType', urlFileType)
      await teamPortalApi.submitDeliverable(token, d.id, fd)
      onRefresh(); setShowUpload(false); setUrlValue('')
    } catch { setError('Submission failed. Please try again.') }
    finally { setUploading(false) }
  }

  return (
    <div className={`overflow-hidden rounded-xl border bg-white ${urgent ? 'border-amber-300' : 'border-slate-200'}`}>
      {urgent && (
        <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
          <Clock className="h-3.5 w-3.5" />
          {hoursLeft > 0 ? `${hoursLeft}h left — submit soon!` : 'Deadline is very soon!'}
        </div>
      )}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{d.title}</p>
          {d.description && <p className="mt-0.5 text-xs text-slate-400">{d.description}</p>}
          <p className="mt-0.5 text-xs text-slate-400">
            Deadline: {formatDate(d.deadline)}
            {d.submissionCount > 0 && <span className="ml-2 text-emerald-600 font-medium">· {d.submissionCount} submitted</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isPast && !d.submitted
            ? <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600"><AlertTriangle className="h-3 w-3" /> Late</span>
            : d.submitted
              ? <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Submitted</span>
              : <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500"><Clock className="h-3 w-3" /> Pending</span>}
          {!isPast && (
            <button onClick={() => setShowUpload((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: TEAL }}>
              <Upload className="h-3 w-3" /> Upload
            </button>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setUrlMode(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${!urlMode ? 'text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              style={!urlMode ? { backgroundColor: TEAL } : {}}>
              <Upload className="mr-1 inline h-3 w-3" /> File
            </button>
            <button onClick={() => setUrlMode(true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${urlMode ? 'text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              style={urlMode ? { backgroundColor: TEAL } : {}}>
              <Link2 className="mr-1 inline h-3 w-3" /> Link / URL
            </button>
          </div>

          {!urlMode ? (
            <div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload}
                accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.mp4,.mov,.webm" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 hover:border-[#0d968b] hover:text-[#0d968b] transition-colors disabled:opacity-60">
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Click to choose a file</>}
              </button>
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="space-y-2">
              <input type="url" placeholder="https://…" value={urlValue} onChange={(e) => setUrlValue(e.target.value)} required
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0d968b]" />
              <div className="flex gap-2">
                <select value={urlFileType} onChange={(e) => setUrlFileType(e.target.value)}
                  className="h-9 flex-1 rounded-lg border border-slate-200 px-2 text-sm text-slate-700 outline-none focus:border-[#0d968b]">
                  <option value="link">Link</option>
                  <option value="video">Video</option>
                  <option value="slides">Slides</option>
                  <option value="demo">Demo</option>
                  <option value="document">Document</option>
                </select>
                <button type="submit" disabled={uploading || !urlValue}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  style={{ backgroundColor: TEAL }}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Submit'}
                </button>
              </div>
            </form>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}

function AiSummaryPanel({ token, eventId, cached }: { token: string; eventId: string; cached: string | null }) {
  const [summary, setSummary] = useState<string | null>(cached)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const initiated = useRef(false)

  useEffect(() => {
    if (summary || initiated.current) return
    initiated.current = true
    generate()
  }, [])

  async function generate() {
    setError(''); setLoading(true)
    try {
      const res = await teamPortalApi.generateEventSummary(token, eventId)
      const s = (res.data as { data?: { summary?: string } })?.data?.summary ?? null
      setSummary(s)
    } catch { setError('Could not generate summary right now.') }
    finally { setLoading(false) }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Sparkles className="h-3.5 w-3.5" style={{ color: TEAL }} /> AI Feedback Summary
        </p>
        {summary && !loading && (
          <button onClick={generate} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: TEAL }} />
          Generating your feedback summary…
        </div>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : summary ? (
        <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
      ) : null}
    </div>
  )
}

const DICEBEAR_BASE = 'https://api.dicebear.com/9.x/adventurer/svg'

function EvaluatorCard({ evaluator, index }: { evaluator: TeamPortalEvaluator; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const avatarUrl = `${DICEBEAR_BASE}?seed=${encodeURIComponent(evaluator.seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`

  const scoredKpis = evaluator.kpiScores.filter((k) => k.score !== null)
  const expertAvg = scoredKpis.length > 0
    ? Math.round(scoredKpis.reduce((acc, k) => acc + (k.score! / k.scaleMax * 10), 0) / scoredKpis.length * 10) / 10
    : null

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <img src={avatarUrl} alt={`Expert ${index + 1}`} className="h-10 w-10 shrink-0 rounded-full border-2 border-white shadow-sm bg-slate-100" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">Expert {index + 1}</p>
            {expertAvg !== null && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: TEAL }}>
                {expertAvg}/10
              </span>
            )}
          </div>
          {evaluator.overallComment && !expanded && (
            <p className="mt-0.5 truncate text-xs italic text-slate-400">"{evaluator.overallComment}"</p>
          )}
          {!evaluator.overallComment && !expanded && (
            <p className="mt-0.5 text-xs text-slate-400">{evaluator.kpiScores.length} criteria scored</p>
          )}
        </div>
        <span className="shrink-0 text-slate-400">{expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {/* KPI scores */}
          {evaluator.kpiScores.length > 0 && (
            <div className="px-4 py-3 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Scores & Comments</p>
              {evaluator.kpiScores.map((kc, j) => (
                <div key={j}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700">{kc.kpiName}</p>
                    {kc.score !== null && (
                      <span className="shrink-0 text-xs font-bold text-slate-500">{kc.score}/{kc.scaleMax}</span>
                    )}
                  </div>
                  {kc.score !== null && <ScoreBar score={kc.score} max={kc.scaleMax} />}
                  {kc.comment && (
                    <p className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs italic text-slate-600">"{kc.comment}"</p>
                  )}
                  {kc.recommendation && (
                    <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">→ {kc.recommendation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Overall comment */}
          {evaluator.overallComment && (
            <div className="px-4 py-3">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Overall Impression</p>
              <blockquote className="border-l-[3px] pl-3 text-sm italic text-slate-600" style={{ borderColor: TEAL }}>
                "{evaluator.overallComment}"
              </blockquote>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EventCard({ entry, token, onRefresh }: { entry: TeamPortalEvent; token: string; onRefresh: () => void }) {
  const [activeTab, setActiveTab] = useState<'feedback' | 'deliverables'>('feedback')
  const [showFullLetter, setShowFullLetter] = useState(false)

  const { event, evaluation, deliverables } = entry
  const hasEval = evaluation.overallAvg !== null || evaluation.evaluators.length > 0 || evaluation.letter
  const hasInsight = !!evaluation.insight
  const urgentCount = deliverables.filter((d) => {
    const ms = new Date(d.deadline).getTime() - Date.now()
    return !d.submitted && ms > 0 && ms <= 48 * 3600 * 1000
  }).length

  const { feedbackStatus } = evaluation
  const hasPending = feedbackStatus.pending > 0

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Event header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-xs font-black" style={{ backgroundColor: TEAL }}>
          {(EVENT_TYPE_LABELS[event.type] ?? 'E').charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate">{event.name}</p>
          <p className="text-xs text-slate-400">
            {EVENT_TYPE_LABELS[event.type] ?? event.type} · {formatDate(event.startDate)}
            {event.endDate !== event.startDate ? ` – ${formatDate(event.endDate)}` : ''}
          </p>
        </div>
        {evaluation.overallAvg !== null && (
          <div className="shrink-0 text-right">
            <p className="text-lg font-black" style={{ color: TEAL }}>{evaluation.overallAvg}/10</p>
            <p className="text-[10px] text-slate-400">overall</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50 px-4 pt-2">
        {(['feedback', 'deliverables'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`mr-1 rounded-t-lg px-4 py-2 text-xs font-semibold transition-all ${activeTab === t
              ? 'border border-b-white border-slate-200 bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'feedback' ? 'Feedback' : (
              <span className="flex items-center gap-1.5">
                Deliverables
                {urgentCount > 0 && <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{urgentCount}</span>}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-5">
        {activeTab === 'feedback' ? (
          <div className="space-y-5">
            {!hasEval ? (
              <p className="text-sm italic text-slate-400">No evaluation data available for this event yet.</p>
            ) : (
              <>
                {/* AI summary of all feedback */}
                <AiSummaryPanel token={token} eventId={event.id} cached={evaluation.aiSummary} />

                {/* AI letter */}
                {evaluation.letter && (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: TEAL }}>M</div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">MEST Programme Team</p>
                        <p className="text-[10px] text-slate-400">Official Feedback Letter</p>
                      </div>
                    </div>
                    <div className="border-l-[3px] px-5 py-4 text-sm leading-relaxed text-slate-700" style={{ borderColor: TEAL }}>
                      {showFullLetter
                        ? evaluation.letter.split('\n\n').map((p, i) => <p key={i} className={i > 0 ? 'mt-3' : ''}>{p}</p>)
                        : <p className="line-clamp-4">{evaluation.letter}</p>}
                    </div>
                    <button onClick={() => setShowFullLetter((v) => !v)}
                      className="flex w-full items-center justify-center gap-1 border-t border-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                      {showFullLetter ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read full letter</>}
                    </button>
                  </div>
                )}

                {/* Per-evaluator feedback with avatars */}
                {(evaluation.evaluators.length > 0 || feedbackStatus.total > 0) && (
                  <div>
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <MessageSquare className="h-3 w-3" style={{ color: TEAL }} />
                        Expert Feedback
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        {feedbackStatus.submitted} of {feedbackStatus.total} submitted
                      </span>
                      {hasPending && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                          <Clock className="h-3 w-3" />
                          {feedbackStatus.pending} still to come
                        </span>
                      )}
                    </div>

                    {hasPending && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <div className="flex -space-x-2 shrink-0">
                          {Array.from({ length: Math.min(feedbackStatus.pending, 3) }).map((_, i) => (
                            <div key={i} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-amber-700">
                          {feedbackStatus.pending === 1
                            ? '1 expert hasn\'t submitted yet — their feedback will appear here when ready.'
                            : `${feedbackStatus.pending} experts haven't submitted yet — their feedback will appear here when ready.`}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {evaluation.evaluators.map((ev, i) => (
                        <EvaluatorCard key={i} evaluator={ev} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* AI insight */}
                {hasInsight && evaluation.insight && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Sparkles className="h-3.5 w-3.5" style={{ color: TEAL }} /> MEST Assessment
                      </p>
                      {evaluation.insight.readinessLevel && (
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${READINESS_META[evaluation.insight.readinessLevel]?.cls ?? 'bg-slate-100 text-slate-600'}`}>
                          {READINESS_META[evaluation.insight.readinessLevel]?.label ?? evaluation.insight.readinessLevel}
                        </span>
                      )}
                    </div>
                    {evaluation.insight.verdict && <p className="mb-3 text-sm font-medium text-slate-800">{evaluation.insight.verdict}</p>}
                    {evaluation.insight.strengths.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Strengths</p>
                        <ul className="space-y-1">
                          {evaluation.insight.strengths.map((s, i) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-700"><Star className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" /> {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {evaluation.insight.improvements.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Areas to Improve</p>
                        <ul className="space-y-1">
                          {evaluation.insight.improvements.map((imp, i) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-700"><TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" /> {imp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {evaluation.insight.recommendation && (
                      <div className="rounded-lg p-3 text-xs text-teal-800" style={{ backgroundColor: `${TEAL}10` }}>
                        <p className="mb-0.5 font-bold">Key Recommendation</p>
                        <p>{evaluation.insight.recommendation}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          /* Deliverables tab */
          <div className="space-y-3">
            {deliverables.length === 0 ? (
              <p className="text-sm italic text-slate-400">No deliverables for this event.</p>
            ) : deliverables.map((d) => (
              <DeliverableCard key={d.id} d={d} token={token} onRefresh={onRefresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main portal view ──────────────────────────────────────────────────────────

function PortalView({ token, onLogout }: { token: string; onLogout: () => void }) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['team-portal', token],
    queryFn: () => teamPortalApi.getMe(token),
    retry: (count, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) return false
      return count < 2
    },
  })

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['team-portal', token] })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: TEAL }} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center px-4">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm font-semibold text-slate-700">Session expired or invalid.</p>
        <button onClick={onLogout} className="text-xs font-semibold underline" style={{ color: TEAL }}>Sign in again</button>
      </div>
    )
  }

  const portal = (data?.data as { data?: TeamPortalData })?.data
  if (!portal) return null

  const { team, events, mentorSessions } = portal

  async function handleLogout() {
    try { await teamPortalApi.logout(token) } catch { /* ignore */ }
    onLogout()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black text-white" style={{ backgroundColor: TEAL }}>M</div>
          <span className="text-sm font-bold text-slate-900">Team Portal</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">

        {/* Team identity */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-5" style={{ background: `linear-gradient(135deg, ${TEAL}12 0%, transparent 60%)` }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{team.name}</h1>
                {team.cohort && (
                  <p className="mt-0.5 text-xs text-slate-500">{team.cohort.name}{team.cohort.year ? ` · ${team.cohort.year}` : ''}</p>
                )}
              </div>
              {team.isDissolved && (
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-500">Dissolved</span>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {team.productIdea && (
                <p className="text-sm italic leading-relaxed text-slate-600">"{team.productIdea}"</p>
              )}
              {team.marketFocus && (
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="text-sm text-slate-600">{team.marketFocus}</span>
                </div>
              )}
              {team.mentor && (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="text-sm text-slate-600">Mentor: {team.mentor.firstName} {team.mentor.lastName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Members */}
          {team.members.length > 0 && (
            <div className="border-t border-slate-100 px-6 py-4">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Team Members</p>
              <div className="flex flex-wrap gap-2">
                {team.members.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: TEAL }}>
                      {m.firstName?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{m.firstName} {m.lastName}</p>
                      {m.roles.length > 0 && (
                        <p className="text-[10px] text-slate-400">{m.roles.map((r) => r.replace(/_/g, ' ')).join(', ')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Events */}
        {events.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" style={{ color: TEAL }} />
              <h2 className="text-sm font-bold text-slate-800">Events & Feedback</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{events.length}</span>
            </div>
            <div className="space-y-4">
              {events.map((entry, i) => <EventCard key={i} entry={entry} token={token} onRefresh={handleRefresh} />)}
            </div>
          </section>
        )}

        {/* Pivots */}
        {team.pivots.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4" style={{ color: TEAL }} />
              <h2 className="text-sm font-bold text-slate-800">Pivots</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{team.pivots.length}</span>
            </div>
            <div className="relative space-y-3 pl-5 before:absolute before:inset-y-0 before:left-1.5 before:w-px before:bg-slate-200">
              {team.pivots.map((p, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-5 top-2 h-3 w-3 rounded-full border-2 border-white" style={{ backgroundColor: TEAL }} />
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{PIVOT_LABELS[p.type] ?? p.type}</span>
                      {p.wasProactive && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Proactive</span>}
                      <span className="ml-auto text-[11px] text-slate-400">{formatDate(p.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700">{p.description}</p>
                    {p.reason && <p className="mt-1 text-xs text-slate-400">Reason: {p.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mentor sessions */}
        {mentorSessions.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: TEAL }} />
              <h2 className="text-sm font-bold text-slate-800">Mentor Sessions</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{mentorSessions.length}</span>
            </div>
            <div className="space-y-3">
              {mentorSessions.map((ms, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">
                      {ms.mentorFirstName ? `Session with ${ms.mentorFirstName}` : 'Mentor Session'}
                    </p>
                    <span className="text-[11px] text-slate-400">{formatDate(ms.date)}</span>
                  </div>
                  {ms.notes && <p className="text-sm leading-relaxed text-slate-600">{ms.notes}</p>}
                  {ms.actionItems.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Action Items</p>
                      <ul className="space-y-1">
                        {ms.actionItems.map((item, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-slate-700">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" style={{ color: TEAL }} /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {events.length === 0 && mentorSessions.length === 0 && team.pivots.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">No activities yet</p>
            <p className="mt-1 text-xs text-slate-400">Your evaluation feedback, mentor sessions, and pivots will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page root ─────────────────────────────────────────────────────────────────

export function TeamPortalPage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(SESSION_KEY))

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY)
    if (stored) setToken(stored)
  }, [])

  function handleAuthenticated(t: string) {
    setToken(t)
  }

  function handleLogout() {
    localStorage.removeItem(SESSION_KEY)
    setToken(null)
  }

  if (!token) {
    return <AuthGate onAuthenticated={handleAuthenticated} />
  }

  return <PortalView token={token} onLogout={handleLogout} />
}
