import { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  X, Sparkles, Loader2, Send, CheckCheck, RefreshCw, AlertCircle,
} from 'lucide-react'
import { evaluationLinksApi } from '@/api/evaluationLinks'

const TEAL = '#0d968b'

interface TeamLetter {
  teamId: string
  teamName: string
  letter: string
}

interface Props {
  eventId: string
  teamIds: string[]
  onClose: () => void
}

export function SendFeedbackPreviewModal({ eventId, teamIds, onClose }: Props) {
  const [letters, setLetters]       = useState<TeamLetter[]>([])
  const [activeTab, setActiveTab]   = useState<string | null>(null)
  const [sent, setSent]             = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const initiated = useRef(false)

  const { mutate: generate, isPending: generating } = useMutation({
    mutationFn: () => evaluationLinksApi.generateTeamLetters(eventId),
    onSuccess: (res) => {
      const ls = (res?.data as { data?: { letters?: TeamLetter[] } })?.data?.letters ?? []
      setLetters(ls)
      setActiveTab(ls[0]?.teamId ?? null)
      setGenerateError(null)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Failed to generate feedback. Please try again.'
      setGenerateError(msg)
    },
  })

  useEffect(() => {
    if (!initiated.current) {
      initiated.current = true
      generate()
    }
  }, [])

  const { mutate: send, isPending: sending } = useMutation({
    mutationFn: () =>
      evaluationLinksApi.sendTeamFeedback(eventId, letters.map((l) => ({ teamId: l.teamId, letter: l.letter }))),
    onSuccess: () => {
      setSent(true)
      setTimeout(() => { setSent(false); onClose() }, 2500)
    },
  })

  const updateLetter = (teamId: string, value: string) => {
    setLetters((prev) => prev.map((l) => (l.teamId === teamId ? { ...l, letter: value } : l)))
  }

  const activeTeam = letters.find((l) => l.teamId === activeTab) ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose() }}
    >
      <div className="relative my-8 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Send Feedback to Teams</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              AI generates a unique, written feedback letter per team — review and edit before sending
            </p>
          </div>
          {!sending && (
            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Loading / Error state ── */}
        {letters.length === 0 && (
          <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
            {generating ? (
              <>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}15` }}>
                  <Sparkles className="h-6 w-6 animate-pulse" style={{ color: TEAL }} />
                </div>
                <p className="text-sm font-semibold text-slate-700">Writing feedback letters…</p>
                <p className="mt-1.5 text-xs text-slate-400">
                  Generating a unique, professional letter for each of the {teamIds.length} team{teamIds.length !== 1 ? 's' : ''}
                </p>
              </>
            ) : generateError ? (
              <>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
                <p className="mb-1 text-sm font-semibold text-slate-800">Generation failed</p>
                <p className="mb-5 max-w-sm text-xs text-red-500">{generateError}</p>
                <button
                  onClick={() => generate()}
                  className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: TEAL }}
                >
                  <RefreshCw className="h-4 w-4" /> Try Again
                </button>
              </>
            ) : null}
          </div>
        )}

        {/* ── Step 2: Review & Edit ── */}
        {letters.length > 0 && (
          <>
            {/* Team tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 bg-slate-50 px-4 pt-3">
              {letters.map((l) => (
                <button
                  key={l.teamId}
                  onClick={() => setActiveTab(l.teamId)}
                  className={`shrink-0 rounded-t-lg px-4 py-2 text-xs font-semibold transition-all ${
                    activeTab === l.teamId
                      ? 'border border-b-white border-slate-200 bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {l.teamName}
                </button>
              ))}
              <button
                onClick={() => { setLetters([]); setActiveTab(null) }}
                className="ml-auto shrink-0 flex items-center gap-1 rounded-md px-2.5 py-1.5 mb-1 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-600"
              >
                <RefreshCw className="h-3 w-3" /> Regenerate All
              </button>
            </div>

            {/* Letter editor */}
            {activeTeam && (
              <div className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{activeTeam.teamName}</p>
                    <p className="text-xs text-slate-400">Edit the letter below — changes are saved automatically</p>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {activeTeam.letter.length} chars
                  </span>
                </div>

                {/* Letter preview panel */}
                <div className="mb-3 overflow-hidden rounded-xl border border-slate-200">
                  {/* Email chrome */}
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: TEAL }}>
                      M
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">MEST Programme Team</p>
                      <p className="text-[10px] text-slate-400">Evaluation Feedback — {activeTeam.teamName}</p>
                    </div>
                  </div>

                  {/* Editable content area */}
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-x-0 top-0 border-l-[3px] border-[#0d968b] bg-transparent" style={{ height: '100%', left: 24 }} />
                    <textarea
                      value={activeTeam.letter}
                      onChange={(e) => updateLetter(activeTeam.teamId, e.target.value)}
                      rows={12}
                      className="w-full resize-none border-0 bg-white px-8 py-5 text-sm leading-relaxed text-slate-700 outline-none focus:ring-0"
                      style={{ paddingLeft: 36 }}
                      placeholder="Letter content…"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  This letter will be sent to all team members with an email address on file.
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
              <p className="text-xs text-slate-400">
                {letters.length} letter{letters.length !== 1 ? 's' : ''} ready to send
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  disabled={sending}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => send()}
                  disabled={sending || sent}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-70 transition-all"
                  style={{ backgroundColor: TEAL }}
                >
                  {sending
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                    : sent
                      ? <><CheckCheck className="h-3.5 w-3.5" /> Sent!</>
                      : <><Send className="h-3.5 w-3.5" /> Send to All Teams</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
