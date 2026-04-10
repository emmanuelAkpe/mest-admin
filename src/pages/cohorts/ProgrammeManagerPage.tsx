import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Clock,
  BookOpen,
  Lightbulb,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Target,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { programmeBriefingApi } from '@/api/programmeBriefing'
import type { ProgrammeBriefing, TeamHealthStatus, BriefingHighlight } from '@/api/programmeBriefing'

const TEAL = '#0d968b'

const STATUS_CONFIG: Record<TeamHealthStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  thriving: { label: 'Thriving', color: '#10b981', bg: '#f0fdf4', icon: TrendingUp },
  on_track: { label: 'On Track', color: '#0d968b', bg: '#f0fdfa', icon: Minus },
  at_risk: { label: 'At Risk', color: '#f59e0b', bg: '#fffbeb', icon: AlertTriangle },
  critical: { label: 'Critical', color: '#ef4444', bg: '#fef2f2', icon: TrendingDown },
}

const HIGHLIGHT_CONFIG: Record<BriefingHighlight['type'], { color: string; bg: string; icon: React.ElementType }> = {
  win: { color: '#10b981', bg: '#f0fdf4', icon: CheckCircle2 },
  concern: { color: '#ef4444', bg: '#fef2f2', icon: AlertTriangle },
  milestone: { color: '#0d968b', bg: '#f0fdfa', icon: Target },
  trend: { color: '#8b5cf6', bg: '#faf5ff', icon: TrendingUp },
}

const PRIORITY_CONFIG = {
  high: { label: 'HIGH', color: '#ef4444', bg: '#fef2f2' },
  medium: { label: 'MED', color: '#f59e0b', bg: '#fffbeb' },
  low: { label: 'LOW', color: '#64748b', bg: '#f8fafc' },
}

function HealthScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
  const r = 40
  const circumference = 2 * Math.PI * r
  const fill = circumference - (score / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={fill}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black text-slate-900">{score}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Health</span>
      </div>
    </div>
  )
}

function BriefingView({ briefing }: { briefing: ProgrammeBriefing }) {
  const [expandedCoaching, setExpandedCoaching] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <HealthScoreRing score={briefing.healthScore} />
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Programme Briefing</span>
            <span className="ml-auto text-xs text-slate-400">
              {formatDistanceToNow(new Date(briefing.generatedAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{briefing.summary}</p>
        </div>
      </div>

      {/* Highlights */}
      {briefing.highlights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {briefing.highlights.map((h, i) => {
            const cfg = HIGHLIGHT_CONFIG[h.type] ?? HIGHLIGHT_CONFIG.trend
            const Icon = cfg.icon
            return (
              <div key={i} className="flex items-start gap-3 rounded-xl p-4" style={{ backgroundColor: cfg.bg }}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: cfg.color }} />
                <p className="text-xs text-slate-700 leading-relaxed">{h.text}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Urgent Actions */}
      {briefing.urgentActions.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Urgent Actions</h3>
          </div>
          <div className="space-y-3">
            {briefing.urgentActions.map((a, i) => {
              const cfg = PRIORITY_CONFIG[a.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium
              return (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-slate-50 bg-slate-50 p-4">
                  <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{a.action}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{a.reason}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Team Health Grid */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-900">Team Health</h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {briefing.teamHealth.map((th, i) => {
            const cfg = STATUS_CONFIG[th.status] ?? STATUS_CONFIG.on_track
            const Icon = cfg.icon
            return (
              <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ backgroundColor: cfg.bg }}>
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: cfg.color, backgroundColor: 'white' }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 truncate">{th.teamName}</span>
                    {th.score != null && (
                      <span className="ml-auto shrink-0 text-xs font-semibold" style={{ color: cfg.color }}>{th.score}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{th.note}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Coaching Prompts */}
      {briefing.coachingPrompts.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900">Coaching Prompts</h3>
            <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
              {briefing.coachingPrompts.length} team{briefing.coachingPrompts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {briefing.coachingPrompts.map((cp, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-slate-100">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  onClick={() => setExpandedCoaching(expandedCoaching === cp.teamName ? null : cp.teamName)}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-800">{cp.teamName}</span>
                    <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">{cp.focusArea}</span>
                  </div>
                  {expandedCoaching === cp.teamName ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                </button>
                {expandedCoaching === cp.teamName && (
                  <div className="border-t border-slate-100 bg-violet-50 px-4 py-3">
                    <p className="text-xs font-medium italic text-violet-800">"{cp.prompt}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resource Recommendations */}
      {briefing.resourceRecommendations.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Resource Recommendations</h3>
          </div>
          <div className="space-y-3">
            {briefing.resourceRecommendations.map((r, i) => (
              <div key={i} className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-900">{r.topic}</p>
                <p className="mt-1 text-xs text-amber-700 leading-relaxed">{r.rationale}</p>
                {r.targetTeams.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.targetTeams.map(t => (
                      <span key={t} className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ProgrammeManagerPage() {
  const { id: cohortId } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: listRes, isLoading: listLoading } = useQuery({
    queryKey: ['briefings', cohortId],
    queryFn: () => programmeBriefingApi.list(cohortId!),
    enabled: !!cohortId,
  })

  const briefings: ProgrammeBriefing[] = (listRes?.data as any)?.data ?? []
  const selected = selectedId ? briefings.find(b => b.id === selectedId) ?? briefings[0] : briefings[0]

  const generate = useMutation({
    mutationFn: () => programmeBriefingApi.generate(cohortId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['briefings', cohortId] })
      setSelectedId(null)
    },
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            <h1 className="text-xl font-black text-slate-900">AI Programme Manager</h1>
          </div>
          <p className="text-sm text-slate-500">
            Reads all data streams and generates a programme health briefing, coaching prompts, and resource recommendations.
          </p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: TEAL }}
        >
          {generate.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Generate Briefing
            </>
          )}
        </button>
      </div>

      {/* History sidebar + main content */}
      {listLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : briefings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 p-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
            <Sparkles className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">No briefings yet</p>
            <p className="mt-1 text-sm text-slate-400">Click "Generate Briefing" to get your first AI programme analysis.</p>
          </div>
          <button
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generate.isPending ? 'Generating…' : 'Generate your first briefing'}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* History list */}
          <div className="space-y-2">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">History</p>
            {briefings.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={`w-full rounded-xl p-3 text-left transition-colors ${
                  (selected?.id === b.id) ? 'bg-teal-50 ring-1 ring-teal-200' : 'bg-white hover:bg-slate-50 border border-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">
                    {new Date(b.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                  <span className={`text-xs font-bold ${b.healthScore >= 75 ? 'text-green-600' : b.healthScore >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {b.healthScore}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {formatDistanceToNow(new Date(b.generatedAt), { addSuffix: true })}
                </p>
                {b.urgentActions.filter(a => a.priority === 'high').length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-red-500">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {b.urgentActions.filter(a => a.priority === 'high').length} urgent
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Selected briefing */}
          <div>
            {selected ? <BriefingView briefing={selected} /> : (
              <div className="flex items-center justify-center py-20 text-slate-400">
                <Clock className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
