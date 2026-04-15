import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2, Copy, CheckCheck, Check, AlertTriangle, Link2, Users, Mail, MailCheck } from 'lucide-react'
import { teamsApi } from '@/api/teams'
import { evaluationLinksApi } from '@/api/evaluationLinks'
import type { Team } from '@/types'

const TEAL = '#0d968b'

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b] placeholder:text-slate-400'

interface EvaluatorRow {
  id: string
  name: string
  email: string
}

interface GeneratedLink {
  evaluatorName: string
  evaluatorEmail: string
  token: string
  url: string
  emailSent: boolean
}

interface Props {
  eventId: string
  onClose: () => void
}

function uid() {
  return Math.random().toString(36).slice(2)
}

export function GenerateEvaluationLinkModal({ eventId, onClose }: Props) {
  const queryClient = useQueryClient()

  const [evaluators, setEvaluators] = useState<EvaluatorRow[]>([
    { id: uid(), name: '', email: '' },
  ])
  const [expiresAt, setExpiresAt] = useState('')
  const [generated, setGenerated] = useState<GeneratedLink[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  // Fetch teams silently — all will be auto-included
  const { data: teamsData } = useQuery({
    queryKey: ['event-teams', eventId],
    queryFn: () => teamsApi.listByEvent(eventId),
    staleTime: 60_000,
  })
  const rawTeams = teamsData?.data?.data ?? []
  const teams: Team[] = Array.isArray(rawTeams) ? rawTeams : []
  const teamIds = teams.map((t) => t.id)

  /* ── Row helpers ── */
  const addRow = () =>
    setEvaluators((prev) => [...prev, { id: uid(), name: '', email: '' }])

  const removeRow = (id: string) =>
    setEvaluators((prev) => prev.filter((r) => r.id !== id))

  const updateRow = (id: string, field: 'name' | 'email', value: string) =>
    setEvaluators((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )

  /* ── Generate all ── */
  const handleGenerate = async () => {
    setErrors([])
    const valid = evaluators.filter((r) => r.name.trim())
    if (valid.length === 0) {
      setErrors(['At least one evaluator name is required.'])
      return
    }
    if (!expiresAt) {
      setErrors(['Please set an expiry date.'])
      return
    }
    if (teamIds.length === 0) {
      setErrors(['No teams found for this session. Add teams first.'])
      return
    }

    setIsGenerating(true)
    const results: GeneratedLink[] = []
    const errs: string[] = []

    await Promise.allSettled(
      valid.map(async (row) => {
        try {
          const res = await evaluationLinksApi.create(eventId, {
            evaluatorName: row.name.trim(),
            evaluatorEmail: row.email.trim() || undefined,
            teams: teamIds,
            expiresAt: new Date(expiresAt).toISOString(),
          })
          const d = (res.data as { data?: { token?: string; evaluatorName?: string; evaluatorEmail?: string; emailSent?: boolean } })?.data
          if (d?.token) {
            results.push({
              evaluatorName: d.evaluatorName ?? row.name.trim(),
              evaluatorEmail: d.evaluatorEmail ?? row.email.trim(),
              token: d.token,
              url: `${window.location.origin}/evaluate/${d.token}`,
              emailSent: d.emailSent ?? false,
            })
          }
        } catch (err) {
          const msg =
            (err as { response?: { data?: { error?: { message?: string } } } })
              ?.response?.data?.error?.message ?? `Failed for ${row.name.trim()}`
          errs.push(msg)
        }
      })
    )

    setIsGenerating(false)

    if (results.length > 0) {
      setGenerated(results)
      queryClient.invalidateQueries({ queryKey: ['eval-links', eventId] })
    }
    if (errs.length > 0) setErrors(errs)
  }

  /* ── Copy helpers ── */
  const copyOne = (token: string, url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2500)
  }

  const copyAll = () => {
    if (!generated) return
    const text = generated
      .map((g) => `${g.evaluatorName}${g.evaluatorEmail ? ` <${g.evaluatorEmail}>` : ''}\n${g.url}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2500)
  }

  const canGenerate = evaluators.some((r) => r.name.trim()) && !!expiresAt

  /* ══════════════════════════════════════════════
     SUCCESS SCREEN
  ══════════════════════════════════════════════ */
  if (generated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
        <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50">
                <Check className="h-4 w-4 text-emerald-500" />
              </div>
              <h2 className="font-semibold text-slate-900">
                {generated.length} Link{generated.length !== 1 ? 's' : ''} Generated
              </h2>
            </div>
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {errors.length > 0 && (
              <div className="rounded-lg bg-red-50 p-3 space-y-1">
                {errors.map((e, i) => (
                  <p key={i} className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3 shrink-0" /> {e}
                  </p>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-500">
              Share each link directly with the evaluator — tokens are unique and cannot be regenerated.
            </p>

            <div className="space-y-2">
              {generated.map((g) => (
                <div
                  key={g.token}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{g.evaluatorName}</p>
                        {g.emailSent ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 shrink-0">
                            <MailCheck className="h-3 w-3" /> Email sent
                          </span>
                        ) : g.evaluatorEmail ? (
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 shrink-0">
                            <Mail className="h-3 w-3" /> Email failed
                          </span>
                        ) : null}
                      </div>
                      {g.evaluatorEmail && (
                        <p className="text-xs text-slate-400 truncate">{g.evaluatorEmail}</p>
                      )}
                      <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{g.url}</p>
                    </div>
                    <button
                      onClick={() => copyOne(g.token, g.url)}
                      className="shrink-0 flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold transition-colors hover:bg-slate-100"
                      style={copiedToken === g.token ? { borderColor: TEAL, color: TEAL } : {}}
                    >
                      {copiedToken === g.token
                        ? <><CheckCheck className="h-3 w-3" /> Copied</>
                        : <><Copy className="h-3 w-3" /> Copy</>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <button
              onClick={copyAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              {copiedAll
                ? <><CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> Copied All</>
                : <><Copy className="h-3.5 w-3.5" /> Copy All Links</>}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: TEAL }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════════
     FORM
  ══════════════════════════════════════════════ */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Invite Evaluators</h2>
            <p className="text-xs text-slate-400">
              Generate evaluation links for all judges at once
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3 space-y-1">
              {errors.map((e, i) => (
                <p key={i} className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {e}
                </p>
              ))}
            </div>
          )}

          {/* Teams info chip — read-only, auto-included */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <Users className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="text-sm text-slate-600">
              {teams.length === 0
                ? 'Loading teams…'
                : <><span className="font-semibold">{teams.length} team{teams.length !== 1 ? 's' : ''}</span> will be auto-included for evaluation</>}
            </span>
          </div>

          {/* Evaluator rows */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Evaluators
              </label>
              <span className="text-[11px] text-slate-400">{evaluators.length} added</span>
            </div>

            <div className="space-y-2">
              {evaluators.map((row, idx) => (
                <div key={row.id} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-center text-[11px] font-bold text-slate-300">
                    {idx + 1}
                  </span>
                  <input
                    className={inputCls}
                    placeholder="Full name *"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                  />
                  <input
                    className={inputCls}
                    type="email"
                    placeholder="Email (optional)"
                    value={row.email}
                    onChange={(e) => updateRow(row.id, 'email', e.target.value)}
                  />
                  {evaluators.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-[#0d968b] hover:text-[#0d968b]"
            >
              <Plus className="h-3.5 w-3.5" /> Add Another Evaluator
            </button>
          </div>

          {/* Shared expiry */}
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Links Expire At *
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className={inputCls}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              All links share the same expiry — evaluators cannot submit after this time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating || teams.length === 0}
            className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: TEAL }}
          >
            {isGenerating ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Generating…
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Generate {evaluators.filter((r) => r.name.trim()).length || ''} Link{evaluators.filter((r) => r.name.trim()).length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
