import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  User,
  Users,
  Sparkles,
  Star,
  FileText,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Github,
  Linkedin,
  Globe,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BarChart3,
  BookOpen,
} from 'lucide-react'
import { traineePortalApi } from '@/api/traineePortal'
import type { TraineePortalData } from '@/api/traineePortal'
import { formatDistanceToNow, format, isPast } from 'date-fns'

type Step = 'email' | 'otp' | 'portal'

const TEAL = '#0d968b'

// ─── Auth Steps ──────────────────────────────────────────────────────────────

function EmailStep({ onNext }: { onNext: (email: string) => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await traineePortalApi.requestOtp(email.trim().toLowerCase())
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
        Sign in with your MEST email address to view your profile, submissions, and feedback.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: TEAL }}
        >
          {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Send code'}
        </button>
      </form>
    </div>
  )
}

function OtpStep({
  email,
  onVerified,
  onBack,
}: {
  email: string
  onVerified: (token: string) => void
  onBack: () => void
}) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await traineePortalApi.verifyOtp(email, otp.trim())
      const token = (res.data as any)?.data?.accessToken
      if (!token) throw new Error()
      onVerified(token)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="mb-1 text-center text-sm text-slate-500">
        Enter the 6-digit code sent to
      </p>
      <p className="mb-6 text-center text-sm font-semibold text-slate-800">{email}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded-lg border border-slate-200 px-4 py-3 text-center text-2xl font-bold tracking-widest outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          required
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: TEAL }}
        >
          {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Verify'}
        </button>
        <button type="button" onClick={onBack} className="w-full text-center text-xs text-slate-400 hover:text-slate-600">
          ← Use a different email
        </button>
      </form>
    </div>
  )
}

// ─── Portal Sections ─────────────────────────────────────────────────────────

function SkillBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {label}
    </span>
  )
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-teal-600" />
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    late: 'bg-red-100 text-red-700',
    not_submitted: 'bg-slate-100 text-slate-500',
  }
  const icons: Record<string, React.ElementType> = {
    submitted: CheckCircle2,
    pending: Clock,
    late: AlertTriangle,
    not_submitted: Clock,
  }
  const Icon = icons[status] ?? Clock
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-500'}`}>
      <Icon className="h-3 w-3" />
      {status.replace('_', ' ')}
    </span>
  )
}

function PortalContent({ data }: { data: TraineePortalData }) {
  const { trainee, team, submissionLinks, mentorReviews, facilitatorLogs, evaluationScores, insight } = data
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'feedback' | 'scores'>('overview')

  const tabs = [
    { key: 'overview', label: 'Overview', icon: User },
    { key: 'submissions', label: 'Submissions', icon: FileText, count: submissionLinks.length },
    { key: 'feedback', label: 'Feedback', icon: MessageSquare, count: mentorReviews.length + facilitatorLogs.length },
    ...(evaluationScores ? [{ key: 'scores', label: 'Scores', icon: BarChart3 }] : []),
  ] as const

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          {trainee.photo ? (
            <img src={trainee.photo} alt="" className="h-16 w-16 rounded-full object-cover shrink-0" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white" style={{ backgroundColor: TEAL }}>
              {trainee.firstName[0]}{trainee.lastName[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-900">{trainee.firstName} {trainee.lastName}</h2>
            <p className="text-sm text-slate-500">{trainee.email} · {trainee.country}</p>
            {team && (
              <p className="mt-1 text-sm font-medium text-teal-700">
                {team.name}
                {typeof team.event === 'object' && team.event.name && (
                  <span className="ml-1 font-normal text-slate-400">· {(team.event as any).name}</span>
                )}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {trainee.linkedIn && (
                <a href={trainee.linkedIn} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600">
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </a>
              )}
              {trainee.github && (
                <a href={trainee.github} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600">
                  <Github className="h-3.5 w-3.5" /> GitHub
                </a>
              )}
              {trainee.portfolio && (
                <a href={trainee.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-slate-500 hover:text-teal-600">
                  <Globe className="h-3.5 w-3.5" /> Portfolio
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Insight banner */}
      {insight && (
        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">AI Insight</span>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
              insight.profileStrength === 'strong' ? 'bg-green-100 text-green-700' :
              insight.profileStrength === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {insight.profileStrength}
            </span>
          </div>
          <p className="mb-2 text-sm font-semibold text-teal-900">{insight.headline}</p>
          <p className="text-sm text-teal-800 leading-relaxed">{insight.summary}</p>
          {insight.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {insight.tags.map(tag => (
                <span key={tag} className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-700">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {'count' in tab && tab.count > 0 && (
              <span className="rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {trainee.bio && (
            <SectionCard title="About" icon={User}>
              <p className="text-sm text-slate-600 leading-relaxed">{trainee.bio}</p>
            </SectionCard>
          )}

          {team && (
            <SectionCard title="Team" icon={Users}>
              <p className="mb-1 text-sm font-semibold text-slate-800">{team.name}</p>
              {team.productIdea && <p className="mb-3 text-sm text-slate-500">{team.productIdea}</p>}
              <div className="flex flex-wrap gap-2">
                {team.members.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                    {m.photo ? (
                      <img src={m.photo} className="h-6 w-6 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: TEAL }}>
                        {m.firstName?.[0]}{m.lastName?.[0]}
                      </div>
                    )}
                    <span className="text-xs font-medium text-slate-700">{m.firstName} {m.lastName}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {(trainee.top3Skills || trainee.coreTechSkills) && (
            <SectionCard title="Skills" icon={Star}>
              {trainee.top3Skills && (
                <div className="mb-3">
                  <p className="mb-1.5 text-xs font-semibold text-slate-500">Top 3 Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {trainee.top3Skills.split(',').map(s => <SkillBadge key={s} label={s.trim()} />)}
                  </div>
                </div>
              )}
              {trainee.coreTechSkills && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-500">Core Tech Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {trainee.coreTechSkills.split(',').map(s => <SkillBadge key={s} label={s.trim()} />)}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {insight && (
            <SectionCard title="Strengths & Growth" icon={Sparkles}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-bold text-green-600">Strengths</p>
                  <ul className="space-y-1">
                    {insight.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold text-amber-600">Growth Areas</p>
                  <ul className="space-y-1">
                    {insight.growthAreas.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {insight.recommendation && (
                <div className="mt-4 rounded-lg bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-800">Recommendation</p>
                  <p className="mt-1 text-xs text-amber-700 leading-relaxed">{insight.recommendation}</p>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="space-y-3">
          {submissionLinks.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">No submission links yet</p>
            </div>
          ) : (
            submissionLinks.map(link => (
              <div key={link.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-slate-900">{link.title}</h4>
                      <StatusBadge status={link.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Deadline: {isPast(new Date(link.deadline)) ? (
                        <span className="text-red-500">{format(new Date(link.deadline), 'dd MMM yyyy HH:mm')} (passed)</span>
                      ) : (
                        <span className="text-amber-600">{format(new Date(link.deadline), 'dd MMM yyyy HH:mm')} · {formatDistanceToNow(new Date(link.deadline), { addSuffix: true })}</span>
                      )}
                    </p>
                  </div>
                  {link.isActive && (
                    <a
                      href={`/submit/${link.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: TEAL }}
                    >
                      Submit <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {link.submissions.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {link.submissions.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{s.label ?? s.filename ?? s.url}</span>
                        <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{s.fileType}</span>
                      </div>
                    ))}
                  </div>
                )}

                {link.teamReview && (
                  <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      <span className="text-xs font-bold text-teal-700">AI Feedback</span>
                      {link.teamReview.score != null && (
                        <span className="ml-auto rounded-full bg-teal-600 px-2 py-0.5 text-xs font-bold text-white">
                          {link.teamReview.score}/10
                        </span>
                      )}
                    </div>
                    <p className="mb-2 text-xs text-teal-800 leading-relaxed">{link.teamReview.summary}</p>
                    {link.teamReview.strengths.length > 0 && (
                      <ul className="space-y-0.5">
                        {link.teamReview.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-teal-700">
                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                    {link.teamReview.improvements.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {link.teamReview.improvements.map((imp, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                            {imp}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-4">
          {mentorReviews.length === 0 && facilitatorLogs.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">No feedback yet</p>
            </div>
          ) : (
            <>
              {mentorReviews.length > 0 && (
                <SectionCard title="Mentor Reviews" icon={Star}>
                  <div className="space-y-4">
                    {mentorReviews.map(r => (
                      <div key={r.id} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">
                            {typeof r.mentor === 'object' ? `${r.mentor.firstName} ${r.mentor.lastName}` : 'Mentor'}
                          </span>
                          {r.rating != null && (
                            <span className="flex items-center gap-0.5 text-xs text-amber-500">
                              <Star className="h-3 w-3 fill-current" /> {r.rating}/5
                            </span>
                          )}
                          <span className="ml-auto text-xs text-slate-400">
                            {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{r.content}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

              {facilitatorLogs.length > 0 && (
                <SectionCard title="Facilitator Notes" icon={BookOpen}>
                  <div className="space-y-4">
                    {facilitatorLogs.map(l => (
                      <div key={l.id} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">
                            {typeof l.facilitator === 'object' ? `${l.facilitator.firstName} ${l.facilitator.lastName}` : 'Facilitator'}
                          </span>
                          <span className="ml-auto text-xs text-slate-400">
                            {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{l.note}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'scores' && evaluationScores && (
        <SectionCard title="Evaluation Scores" icon={BarChart3}>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black text-white" style={{ backgroundColor: TEAL }}>
              {evaluationScores.overallAvg.toFixed(1)}
            </div>
            <div>
              <p className="text-xs text-slate-500">Overall weighted average</p>
              <p className="text-sm font-semibold text-slate-800">Across {evaluationScores.kpis.length} KPI{evaluationScores.kpis.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="space-y-3">
            {evaluationScores.kpis.map(kpi => (
              <div key={kpi.kpiName}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{kpi.kpiName}</span>
                  <span className="font-bold text-slate-900">{kpi.avgScore.toFixed(1)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (kpi.avgScore / 10) * 100)}%`, backgroundColor: TEAL }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TraineePortalPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [accessToken, setAccessToken] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['trainee-portal', accessToken],
    queryFn: () => traineePortalApi.getMe(accessToken),
    enabled: step === 'portal' && !!accessToken,
    retry: false,
  })

  const portalData: TraineePortalData | null = (data?.data as any)?.data ?? null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      <div className="mx-auto max-w-lg px-4 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-white"
            style={{ backgroundColor: TEAL }}
          >
            <span className="text-lg font-black">M</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">MEST Trainee Portal</h1>
          {step === 'email' && <p className="mt-1 text-sm text-slate-500">Your personal dashboard</p>}
          {step === 'otp' && <p className="mt-1 text-sm text-slate-500">Check your email for a code</p>}
          {step === 'portal' && portalData && (
            <p className="mt-1 text-sm text-slate-500">Welcome back, {portalData.trainee.firstName}</p>
          )}
        </div>

        {step === 'email' && (
          <EmailStep
            onNext={e => {
              setEmail(e)
              setStep('otp')
            }}
          />
        )}

        {step === 'otp' && (
          <OtpStep
            email={email}
            onVerified={token => {
              setAccessToken(token)
              setStep('portal')
            }}
            onBack={() => setStep('email')}
          />
        )}

        {step === 'portal' && (
          <>
            {isLoading && (
              <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                <p className="text-sm">Loading your portal…</p>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50 p-5 text-center">
                <p className="text-sm font-medium text-red-700">Session expired or error loading data.</p>
                <button
                  onClick={() => { setStep('email'); setAccessToken('') }}
                  className="mt-3 text-xs text-red-500 hover:underline"
                >
                  Sign in again
                </button>
              </div>
            )}
            {portalData && <PortalContent data={portalData} />}
          </>
        )}
      </div>
    </div>
  )
}
