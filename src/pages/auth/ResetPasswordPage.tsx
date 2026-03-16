import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)

    try {
      await authApi.resetPassword(token, password)
      navigate('/login')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? 'Reset failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center text-sm text-slate-500">
        Invalid reset link.{' '}
        <Link to="/forgot-password" className="text-indigo-600">
          Request a new one
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">New password</h2>
        <p className="mt-1 text-sm text-slate-500">Choose a strong password.</p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <Input
        id="password"
        type="password"
        label="New password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <Input
        id="confirm"
        type="password"
        label="Confirm password"
        placeholder="••••••••"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />

      <Button type="submit" loading={loading} className="w-full">
        Set new password
      </Button>
    </form>
  )
}
