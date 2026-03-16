import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-5xl font-bold text-slate-200">404</p>
      <p className="text-sm text-slate-500">Page not found</p>
      <Link to="/cohorts" className="text-sm text-indigo-600 hover:text-indigo-700">
        Go to cohorts
      </Link>
    </div>
  )
}
