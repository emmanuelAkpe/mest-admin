import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft, CheckCircle, AlertTriangle, ChevronRight, Users, Check, Loader2 } from 'lucide-react'

import { mest_server } from '@/api/server'

const TEAL = '#0d968b'
const API = mest_server

/* ── Types ── */
interface KpiDef {
  id: string
  name: string
  description: string | null
  weight: number
  scaleType: string
  scaleMin: number | null
  scaleMax: number | null
  requireComment: boolean
  order: number
}

interface TeamMember {
  trainee: { firstName: string; lastName: string; photo?: string | null } | string
  roles?: string[]
}

interface TeamDef {
  id: string
  _id?: string
  name: string
  members: TeamMember[]
  productIdea?: string
  marketFocus?: string
}

interface ExistingTeamScore {
  team: string
  scores: { kpi: string; score: number; comment?: string }[]
  overallComment?: string
}

interface FormData {
  evaluatorName: string
  event: { id: string; name: string; type: string; startDate: string; endDate: string }
  teams: TeamDef[]
  kpis: KpiDef[]
  existingSubmission: null | { teamScores: ExistingTeamScore[]; submittedAt: string }
}

type KpiScore = { score: number; comment: string }
type TeamScores = Record<string, KpiScore>

/* ── Helpers ── */
function tid(t: TeamDef) { return t.id ?? t._id ?? '' }

function scaleRange(kpi: KpiDef) {
  switch (kpi.scaleType) {
    case '1_to_5':     return { min: 1, max: 5 }
    case '1_to_10':    return { min: 1, max: 10 }
    case 'percentage': return { min: 0, max: 100 }
    case 'custom':     return { min: kpi.scaleMin ?? 0, max: kpi.scaleMax ?? 10 }
    default:           return { min: 1, max: 10 }
  }
}

function defaultScore(kpi: KpiDef) {
  const { min, max } = scaleRange(kpi)
  return Math.round((min + max) / 2)
}

function isTeamComplete(kpis: KpiDef[], scores: TeamScores): boolean {
  return kpis.every((kpi) => {
    const s = scores[kpi.id]
    return s !== undefined && (!kpi.requireComment || s.comment.trim())
  })
}

function memberName(m: TeamMember): string {
  if (typeof m.trainee === 'object') return `${m.trainee.firstName} ${m.trainee.lastName}`
  return 'Member'
}

function initScores(kpis: KpiDef[]): TeamScores {
  return Object.fromEntries(kpis.map((k) => [k.id, { score: defaultScore(k), comment: '' }]))
}

function scoresFromExisting(kpis: KpiDef[], existing: ExistingTeamScore['scores']): TeamScores {
  const base = initScores(kpis)
  for (const s of existing) {
    if (base[s.kpi] !== undefined) {
      base[s.kpi] = { score: s.score, comment: s.comment ?? '' }
    }
  }
  return base
}

/* ══════════════════════════════════════════════
   HEADER
══════════════════════════════════════════════ */
function Header({ eventName, evaluatorName }: { eventName?: string; evaluatorName?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="MEST" className="h-7 w-auto" />
        </div>
        {evaluatorName && (
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-xs font-semibold text-slate-800">{evaluatorName}</p>
            {eventName && <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{eventName}</p>}
          </div>
        )}
      </div>
    </header>
  )
}

/* ══════════════════════════════════════════════
   KPI SLIDER CARD
══════════════════════════════════════════════ */
function KpiCard({
  kpi, score, comment, onChange,
}: {
  kpi: KpiDef
  score: number
  comment: string
  onChange: (score: number, comment: string) => void
}) {
  const { min, max } = scaleRange(kpi)
  const pct = ((score - min) / (max - min)) * 100
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">{kpi.name}</p>
          {kpi.description && <p className="mt-0.5 text-sm text-slate-500">{kpi.description}</p>}
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: TEAL }}>
          w: {kpi.weight}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Score</span>
          <span className="text-2xl font-extrabold tabular-nums" style={{ color: TEAL }}>{score}</span>
        </div>
        <input
          type="range" min={min} max={max} step={1} value={score}
          onChange={(e) => onChange(Number(e.target.value), comment)}
          className="w-full h-2 rounded-lg cursor-pointer appearance-none bg-slate-200"
          style={{ accentColor: TEAL }}
        />
        <div className="flex justify-between px-0.5">
          {ticks.map((t) => (
            <span key={t} className="text-[9px] font-bold transition-colors"
              style={{ color: t === score ? TEAL : '#cbd5e1' }}>{t}</span>
          ))}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full transition-all duration-150"
            style={{ width: `${pct}%`, backgroundColor: TEAL }} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
          Comment {kpi.requireComment
            ? <span className="text-red-400 ml-0.5">*</span>
            : <span className="font-normal text-slate-400">(optional)</span>}
        </label>
        <textarea
          rows={3} value={comment}
          onChange={(e) => onChange(score, e.target.value)}
          placeholder="Justify your score…"
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   TEAM LIST VIEW
══════════════════════════════════════════════ */
function TeamListView({
  formData,
  submittedTeams,
  allScores,
  onSelectTeam,
}: {
  formData: FormData
  submittedTeams: Set<string>
  allScores: Record<string, TeamScores>
  onSelectTeam: (id: string) => void
}) {
  const total = formData.teams.length
  const submitted = submittedTeams.size
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0
  const allDone = submitted === total

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      {/* Event hero */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: TEAL }}>
          Evaluation Portal
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {formData.event.name}
        </h1>
        <p className="text-slate-500">
          Welcome, <span className="font-semibold text-slate-800">{formData.evaluatorName}</span>.
          Score each team on {formData.kpis.length} KPI{formData.kpis.length !== 1 ? 's' : ''}.
          You can submit after each team and edit any time.
        </p>

        {/* Progress */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-500">{submitted} of {total} teams submitted</span>
            <span style={{ color: TEAL }}>{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: TEAL }} />
          </div>
        </div>

        {allDone && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-emerald-700"
            style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
            <CheckCircle className="h-4 w-4 shrink-0" />
            All teams submitted — you can still edit any score above.
          </div>
        )}
      </div>

      {/* Team cards */}
      <div className="space-y-3 pb-12">
        {formData.teams.map((team) => {
          const id = tid(team)
          const isSubmitted = submittedTeams.has(id)
          const isScored = isTeamComplete(formData.kpis, allScores[id] ?? {})
          return (
            <button
              key={id}
              onClick={() => onSelectTeam(id)}
              className="group w-full rounded-xl border bg-white p-5 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ borderColor: isSubmitted ? `${TEAL}40` : '#e2e8f0' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">{team.name}</h3>
                    {isSubmitted ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        <Check className="h-3 w-3" /> Submitted
                      </span>
                    ) : isScored ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-600">
                        Scored — not submitted
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                        Not Scored
                      </span>
                    )}
                  </div>

                  {team.productIdea && (
                    <p className="text-sm italic text-slate-500 line-clamp-2">
                      "{team.productIdea}"
                    </p>
                  )}

                  {team.marketFocus && (
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold">Market:</span> {team.marketFocus}
                    </p>
                  )}

                  {team.members.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-300" />
                      {team.members.slice(0, 5).map((m, i) => (
                        <span key={i} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {memberName(m)}
                        </span>
                      ))}
                      {team.members.length > 5 && (
                        <span className="text-[11px] text-slate-400">+{team.members.length - 5} more</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-sm font-bold transition-colors"
                  style={{ color: isSubmitted ? TEAL : '#64748b' }}>
                  {isSubmitted ? 'Edit' : isScored ? 'Review & Submit' : 'Evaluate'}
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   TEAM SCORING VIEW
══════════════════════════════════════════════ */
function TeamScoringView({
  team,
  kpis,
  scores,
  overallComment: initialOverallComment,
  isSubmitted,
  onSubmit,
  onBack,
}: {
  team: TeamDef
  kpis: KpiDef[]
  scores: TeamScores
  overallComment: string
  isSubmitted: boolean
  onSubmit: (scores: TeamScores, overallComment: string) => Promise<void>
  onBack: () => void
}) {
  const [local, setLocal] = useState<TeamScores>(() => ({
    ...initScores(kpis),
    ...scores,
  }))
  const [overallComment, setOverallComment] = useState(initialOverallComment)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (kpiId: string, score: number, comment: string) =>
    setLocal((prev) => ({ ...prev, [kpiId]: { score, comment } }))

  const handleSubmit = async () => {
    setError(null)
    if (!overallComment.trim()) {
      setError('An overall comment is required.')
      return
    }
    for (const kpi of kpis) {
      if (kpi.requireComment && !local[kpi.id]?.comment?.trim()) {
        setError(`Comment is required for "${kpi.name}".`)
        return
      }
    }
    setSubmitting(true)
    try {
      await onSubmit(local, overallComment.trim())
    } catch (err) {
      setError(
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Submission failed. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const complete = isTeamComplete(kpis, local) && overallComment.trim().length > 0

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Teams
      </button>

      {/* Team context card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
            {isSubmitted ? 'Editing Evaluation' : 'Now Evaluating'}
          </p>
          <h2 className="text-xl font-extrabold text-slate-900">{team.name}</h2>
        </div>

        {team.productIdea && (
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Product Idea</p>
            <p className="text-sm text-slate-700 italic">"{team.productIdea}"</p>
          </div>
        )}

        {team.marketFocus && (
          <p className="text-sm text-slate-600">
            <span className="font-semibold">Market Focus:</span> {team.marketFocus}
          </p>
        )}

        {team.members.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Team Members</p>
            <div className="flex flex-wrap gap-1.5">
              {team.members.map((m, i) => (
                <span key={i}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                  {memberName(m)}
                  {m.roles && m.roles.length > 0 && (
                    <span className="ml-1 text-slate-400">· {m.roles[0].replace(/_/g, ' ')}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-600">{kpis.length} KPI{kpis.length !== 1 ? 's' : ''} to score</p>
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.id}
            kpi={kpi}
            score={local[kpi.id]?.score ?? defaultScore(kpi)}
            comment={local[kpi.id]?.comment ?? ''}
            onChange={(score, comment) => update(kpi.id, score, comment)}
          />
        ))}
      </div>

      {/* Overall comment */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
        <label className="block text-sm font-bold text-slate-900">
          Overall Comment <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-slate-500">
          Summarise your overall impression of this team's performance.
        </p>
        <textarea
          rows={4}
          value={overallComment}
          onChange={(e) => setOverallComment(e.target.value)}
          placeholder="Your overall thoughts on the team…"
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
        />
      </div>

      {/* Submit */}
      <div className="pb-12 space-y-3">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting || !complete}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-4 text-base font-bold text-white shadow-lg transition-all disabled:opacity-40"
          style={{ backgroundColor: TEAL }}
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
          ) : isSubmitted ? (
            <><Check className="h-5 w-5" /> Update Submission</>
          ) : (
            <><Check className="h-5 w-5" /> Submit Team</>
          )}
        </button>
        {!complete && (
          <p className="text-center text-xs text-slate-400">
            Fill in all required fields to submit
          </p>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export function EvaluatePage() {
  const { token } = useParams<{ token: string }>()

  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [allScores, setAllScores] = useState<Record<string, TeamScores>>({})
  const [overallComments, setOverallComments] = useState<Record<string, string>>({})
  // Set of team IDs that have been confirmed submitted to the server
  const [submittedTeams, setSubmittedTeams] = useState<Set<string>>(new Set())
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    axios.get(`${API}/evaluate/${token}`)
      .then((res) => {
        const data = res.data?.data as FormData
        setFormData(data)

        // Init scores for all teams
        const init: Record<string, TeamScores> = {}
        for (const team of data.teams) {
          init[tid(team)] = initScores(data.kpis)
        }

        // Restore any previously submitted scores
        if (data.existingSubmission?.teamScores) {
          const submitted = new Set<string>()
          const restoredComments: Record<string, string> = {}
          for (const ts of data.existingSubmission.teamScores) {
            const id = typeof ts.team === 'string' ? ts.team : (ts.team as unknown as { toString(): string }).toString()
            init[id] = scoresFromExisting(data.kpis, ts.scores)
            restoredComments[id] = ts.overallComment ?? ''
            submitted.add(id)
          }
          setSubmittedTeams(submitted)
          setOverallComments(restoredComments)
        }

        setAllScores(init)
      })
      .catch((err) => {
        const status = err?.response?.status
        const msg = err?.response?.data?.error?.message
        setFetchError(
          msg ??
          (status === 404 ? 'This evaluation link was not found.' : null) ??
          'Failed to load the evaluation form.'
        )
      })
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmitTeam = async (teamId: string, scores: TeamScores, overallComment: string) => {
    if (!formData) return
    const teamScores = [{
      team: teamId,
      overallComment,
      scores: formData.kpis.map((kpi) => ({
        kpi: kpi.id,
        score: scores[kpi.id]?.score ?? defaultScore(kpi),
        comment: scores[kpi.id]?.comment || undefined,
      })),
    }]
    // Throws on error — caught in TeamScoringView
    await axios.post(`${API}/evaluate/${token}`, { teamScores })
    // On success: update local state
    setAllScores((prev) => ({ ...prev, [teamId]: scores }))
    setOverallComments((prev) => ({ ...prev, [teamId]: overallComment }))
    setSubmittedTeams((prev) => new Set([...prev, teamId]))
    setActiveTeamId(null)
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8f8] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 mx-auto"
            style={{ borderTopColor: TEAL }} />
          <p className="text-sm text-slate-500">Loading evaluation…</p>
        </div>
      </div>
    )
  }

  /* ── Error ── */
  if (fetchError || !formData) {
    return (
      <div className="min-h-screen bg-[#f6f8f8]">
        <Header />
        <div className="flex min-h-[80vh] items-center justify-center p-4">
          <div className="max-w-sm w-full rounded-xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-900">Link Unavailable</h2>
            <p className="mt-2 text-sm text-slate-500">{fetchError}</p>
          </div>
        </div>
      </div>
    )
  }

  /* ── Team scoring view ── */
  if (activeTeamId) {
    const team = formData.teams.find((t) => tid(t) === activeTeamId)!
    return (
      <div className="min-h-screen bg-[#f6f8f8]">
        <Header eventName={formData.event.name} evaluatorName={formData.evaluatorName} />
        <TeamScoringView
          team={team}
          kpis={formData.kpis}
          scores={allScores[activeTeamId] ?? initScores(formData.kpis)}
          overallComment={overallComments[activeTeamId] ?? ''}
          isSubmitted={submittedTeams.has(activeTeamId)}
          onSubmit={(scores, comment) => handleSubmitTeam(activeTeamId, scores, comment)}
          onBack={() => setActiveTeamId(null)}
        />
        <footer className="pb-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Meltwater Entrepreneurial School of Technology
        </footer>
      </div>
    )
  }

  /* ── Team list view ── */
  return (
    <div className="min-h-screen bg-[#f6f8f8]">
      <Header eventName={formData.event.name} evaluatorName={formData.evaluatorName} />
      <TeamListView
        formData={formData}
        submittedTeams={submittedTeams}
        allScores={allScores}
        onSelectTeam={setActiveTeamId}
      />
      <footer className="pb-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Meltwater Entrepreneurial School of Technology
      </footer>
    </div>
  )
}
