import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '@/api/auth'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Something went wrong'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-700">
          If an account exists for <strong>{email}</strong>, a reset link has been sent.
          Check your inbox.
        </p>
        <Link
          to="/login"
          className="mt-4 block text-sm font-medium text-[#0d968b] hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-4">
        <img src="/logo.png" alt="MEST" className="h-8 w-auto" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Reset password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your email and we'll send a reset link.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-lg font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#0d968b' }}
            onMouseEnter={(e) =>
              !loading && (e.currentTarget.style.backgroundColor = '#0b847a')
            }
            onMouseLeave={(e) =>
              !loading && (e.currentTarget.style.backgroundColor = '#0d968b')
            }
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>

          <Link
            to="/login"
            className="text-center text-sm text-slate-500 hover:text-slate-700"
          >
            Back to sign in
          </Link>
        </form>
      </div>
    </div>
  )
}
