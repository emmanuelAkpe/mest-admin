import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  X, Sparkles, Loader2, TrendingDown, TrendingUp, Minus, Star, RefreshCw,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { evaluationLinksApi, type EvalSubmission, type EvalSubmissionSummary } from '@/api/evaluationLinks'
import type { EvaluationLink } from '@/types'

const TEAL = '#0d968b'

function scaleMax(t: string) { return t === '1_to_5' ? 5 : t === '1_to_10' ? 10 : t === 'percentage' ? 100 : 10 }
function scorePct(s: number, t: string) { return Math.round((s / scaleMax(t)) * 100) }
function scoreColor(p: number) { return p >= 70 ? TEAL : p >= 40 ? '#f59e0b' : '#ef4444' }
function initials(n: string) { return n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() }

const STYLE = {
  strict:   { label: 'Strict Grader',    Icon: TrendingDown, cls: 'bg-red-50 text-red-600 border-red-200',           desc: 'scored below group average' },
  balanced: { label: 'Balanced Grader',  Icon: Minus,        cls: 'bg-slate-50 text-slate-600 border-slate-200',     desc: 'scored close to group average' },
  generous: { label: 'Generous Grader',  Icon: TrendingUp,   cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', desc: 'scored above group average' },
}

interface Props { link: EvaluationLink; onClose: () => void }

export function EvalFeedbackModal({ link, onClose }: Props) {
  const [summary, setSummary]     = useState<EvalSubmissionSummary | null>(null)
  const [activeTeam, setActiveTeam] = useState<string | null>(null)
  const initiated = useRef(false)

  const { data: raw, isLoading } = useQuery({
    queryKey: ['eval-link-detail', link.id],
    queryFn: () => evaluationLinksApi.getLink(link.id),
    staleTime: 60_000,
  })

  const submission: EvalSubmission | null =
    (raw?.data as { data?: { submission?: EvalSubmission | null } })?.data?.submission ?? null

  const { mutate: generateSummary, isPending: generating } = useMutation({
    mutationFn: () => evaluationLinksApi.summarize(link.id),
    onSuccess: (res) => {
      const s = (res?.data as { data?: { summary?: EvalSubmissionSummary } })?.data?.summary
      if (s) setSummary(s)
    },
  })

  useEffect(() => {
    if (!submission || initiated.current) return
    initiated.current = true
    if (submission.aiSummary) setSummary(submission.aiSummary)
    else generateSummary()
    setActiveTeam(submission.teamScores[0]?.team.id ?? null)
  }, [submission])

  const activeScore = submission?.teamScores.find((ts) => ts.team.id === activeTeam) ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative my-8 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="relative bg-gradient-to-r from-[#0d968b] to-[#0b7a71] px-7 pb-6 pt-6">
          <button onClick={onClose}
            className="absolute right-5 top-5 rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-base font-black text-white">
              {initials(link.evaluatorName)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-white">{link.evaluatorName}</h2>
              {link.evaluatorEmail && <p className="mt-0.5 text-sm text-white/70">{link.evaluatorEmail}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-400/25 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-100">
                  Submitted
                </span>
                {submission && (
                  <span className="text-xs text-white/60">
                    {format(parseISO(submission.submittedAt), 'MMM d, yyyy · h:mm a')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: TEAL }} />
            <p className="mt-2 text-sm text-slate-400">Loading feedback…</p>
          </div>
        ) : !submission ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-sm font-medium text-slate-500">No submission yet</p>
          </div>
        ) : (
          <div>
            {/* ── AI Summary (overall, always visible) ── */}
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: TEAL }} />
                  <span className="text-xs font-bold text-slate-700">Overall Summary</span>
                </div>
                <button
                  onClick={() => { initiated.current = false; generateSummary() }}
                  disabled={generating}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>

              {generating && !summary ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: TEAL }} />
                  <p className="text-sm text-slate-500">Generating summary…</p>
                </div>
              ) : summary ? (
                <SummaryPanel summary={summary} />
              ) : null}
            </div>

            {/* ── Team Tabs ── */}
            {submission.teamScores.length > 1 && (
              <div className="flex gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50 px-4 pt-3">
                {submission.teamScores.map((ts) => (
                  <button
                    key={ts.team.id}
                    onClick={() => setActiveTeam(ts.team.id)}
                    className={`shrink-0 rounded-t-lg px-4 py-2 text-xs font-semibold transition-all ${
                      activeTeam === ts.team.id
                        ? 'border border-b-white border-slate-200 bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {ts.team.name}
                  </button>
                ))}
              </div>
            )}

            {/* ── Active team feedback ── */}
            <div className="max-h-[45vh] overflow-y-auto p-6">
              {activeScore ? (
                <TeamScoreCard ts={activeScore} />
              ) : (
                <p className="text-sm text-slate-400">Select a team above</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Summary Panel ── */
function SummaryPanel({ summary }: { summary: EvalSubmissionSummary }) {
  const conf = STYLE[summary.scoringStyle] ?? STYLE.balanced
  const { Icon } = conf

  return (
    <div className="space-y-3">
      {/* Scoring style + take */}
      <div className="flex flex-wrap items-start gap-3">
        <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${conf.cls}`}>
          <Icon className="h-3 w-3" /> {conf.label}
          <span className="font-normal opacity-70">— {conf.desc}</span>
        </span>
      </div>

      <p className="text-sm leading-relaxed text-slate-600">{summary.overallTake}</p>

      {/* Key themes */}
      {summary.keyThemes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {summary.keyThemes.map((t) => (
            <span key={t} className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{ borderColor: `${TEAL}40`, color: TEAL, backgroundColor: `${TEAL}0d` }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Standout */}
      {summary.standoutComment && (
        <div className="flex gap-2.5 rounded-xl border-l-4 bg-amber-50 py-3 pl-3 pr-4" style={{ borderColor: '#f59e0b' }}>
          <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <p className="text-xs italic leading-relaxed text-slate-600">"{summary.standoutComment}"</p>
        </div>
      )}
    </div>
  )
}

/* ── Team Score Card ── */
function TeamScoreCard({ ts }: { ts: EvalSubmission['teamScores'][0] }) {
  return (
    <div className="space-y-1">
      {/* Overall comment */}
      {ts.overallComment && (
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Comment</p>
          <p className="text-sm italic leading-relaxed text-slate-600">"{ts.overallComment}"</p>
        </div>
      )}

      {/* KPI scores */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-50">
          {ts.scores.map((s) => {
            const pct   = scorePct(s.score, s.kpi.scaleType)
            const color = scoreColor(pct)
            const max   = scaleMax(s.kpi.scaleType)

            return (
              <div key={s.kpi.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">{s.kpi.name}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="min-w-[2.5rem] rounded-full px-2 py-0.5 text-center text-xs font-extrabold"
                      style={{ backgroundColor: `${color}18`, color }}>
                      {s.score}/{max}
                    </span>
                  </div>
                </div>
                {s.comment && (
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{s.comment}</p>
                )}
                {s.recommendation && (
                  <p className="mt-1 text-xs font-medium" style={{ color: TEAL }}>↳ {s.recommendation}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
