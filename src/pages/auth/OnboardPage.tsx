import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

export function OnboardPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { setAuth, setAccessToken } = useAuthStore()
  const navigate = useNavigate()

  if (!token || !email) {
    return (
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-700">
          This invitation link is invalid or incomplete.
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setError('')
    setLoading(true)

    try {
      const { data: onboardRes } = await authApi.onboard({ email, token, password })
      const accessToken = onboardRes.data.accessToken
      setAccessToken(accessToken)

      const { data: meRes } = await authApi.me()
      setAuth(meRes.data, accessToken)
      navigate('/select-cohort')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Failed to set up account'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-4">
        <img src="/logo.png" alt="MEST" className="h-8 w-auto" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Set up your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            You've been invited to{' '}
            <span className="font-medium text-slate-700">{email}</span>
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
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#0d968b]"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            {loading ? 'Setting up…' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
