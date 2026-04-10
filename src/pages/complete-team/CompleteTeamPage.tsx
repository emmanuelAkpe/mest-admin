import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import publicApi from '@/api/publicClient'

const TEAL = '#0d968b'

interface TeamData {
  id: string
  name: string
  eventName: string | null
  productIdea: string
  marketFocus: string
}

export function CompleteTeamPage() {
  const { token } = useParams<{ token: string }>()

  const [status, setStatus] = useState<'loading' | 'form' | 'submitting' | 'success' | 'invalid'>('loading')
  const [team, setTeam] = useState<TeamData | null>(null)
  const [productIdea, setProductIdea] = useState('')
  const [marketFocus, setMarketFocus] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    publicApi.get(`/complete-team/${token}`)
      .then((res) => {
        const data = (res.data as { data: { team: TeamData } }).data
        setTeam(data.team)
        setProductIdea(data.team.productIdea)
        setMarketFocus(data.team.marketFocus)
        setStatus('form')
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus('submitting')
    try {
      await publicApi.patch(`/complete-team/${token}`, {
        productIdea: productIdea || undefined,
        marketFocus: marketFocus || undefined,
      })
      setStatus('success')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('form')
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0d968b] focus:ring-2 focus:ring-[#0d968b]/20 placeholder:text-slate-400'

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#0d968b]" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link invalid or expired</h1>
          <p className="text-sm text-slate-500">This link is no longer valid. Contact your MEST coordinator for a new one.</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}15` }}>
            <CheckCircle className="h-8 w-8" style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Team details saved!</h1>
          <p className="text-sm text-slate-500">
            <strong>{team?.name}</strong>'s details have been updated. You can close this page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-block rounded-xl px-4 py-1.5 text-sm font-bold text-white mb-6" style={{ backgroundColor: TEAL }}>
            MEST
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Team details</h1>
          <p className="mt-2 text-sm text-slate-500">
            Fill in your team's information for <strong>{team?.eventName ?? 'this event'}</strong>.
            This helps mentors and judges understand what you're building.
          </p>
        </div>

        {/* Team name badge */}
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-sm px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-sm font-bold" style={{ backgroundColor: TEAL }}>
            {team?.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Team</p>
            <p className="text-base font-bold text-slate-900">{team?.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Product Idea
              </label>
              <textarea
                value={productIdea}
                onChange={(e) => setProductIdea(e.target.value)}
                placeholder="Describe what your product does and the problem it solves…"
                rows={5}
                className={`${inputCls} resize-none`}
              />
              <p className="mt-1.5 text-xs text-slate-400">Be specific — what does it do, who is it for, and what makes it different?</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Market Focus
              </label>
              <textarea
                value={marketFocus}
                onChange={(e) => setMarketFocus(e.target.value)}
                placeholder="Who are your target customers? What market or industry are you focused on?"
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: TEAL }}
          >
            {status === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" />}
            {status === 'submitting' ? 'Saving…' : 'Save Team Details'}
          </button>

          <p className="text-center text-xs text-slate-400">
            You can update these details anytime using this link while it's active.
          </p>
        </form>
      </div>
    </div>
  )
}
