import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cohortsApi } from '@/api/cohorts'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { useCohortStore } from '@/store/cohort'
import { Skeleton } from '@/components/ui/Skeleton'
import { CreateCohortModal } from './CreateCohortModal'
import type { Cohort, CohortStatus } from '@/types'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

export function CohortSelectionPage() {
  const { admin, clearAuth } = useAuthStore()
  const { setActiveCohort } = useCohortStore()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  const { data: cohorts, isLoading, isError } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list({ limit: 50 }),
    select: (res) => res.data.data as unknown as Cohort[],
  })

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

  const initials = admin
    ? `${admin.firstName[0]}${admin.lastName[0]}`.toUpperCase()
    : '?'

  return (
    <div className="flex min-h-screen flex-col bg-background-light">
      <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4 md:px-20">
        <img src="/logo.png" alt="MEST" className="h-7 w-auto" />
        <div className="flex items-center gap-4">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${TEAL}1a`, color: TEAL }}
          >
            {admin?.role === 'super_admin' ? 'Super Admin' : 'Program Admin'}
          </span>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: TEAL }}
          >
            {initials}
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 py-16">
        <div className="w-full max-w-5xl">
          <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="mb-2 text-2xl font-bold text-slate-900">
                Select Cohort
              </h3>
              <p className="text-slate-500">
                Choose a cohort to manage performance metrics and insights.
              </p>
            </div>
            {admin?.role === 'super_admin' && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center justify-center gap-2 rounded-lg border px-6 py-3 font-bold transition-all"
                style={{
                  borderColor: `${TEAL}33`,
                  backgroundColor: `${TEAL}1a`,
                  color: TEAL,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = `${TEAL}33`)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = `${TEAL}1a`)
                }
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Create New Cohort
              </button>
            )}
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-4 h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <p className="text-sm text-red-500">Failed to load cohorts.</p>
          )}

          {cohorts && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cohorts.map((cohort) => (
                <CohortCard
                  key={cohort.id}
                  cohort={cohort}
                  onEnter={(id) => { setActiveCohort(id); navigate(`/cohorts/${id}`) }}
                />
              ))}

              <button
                onClick={() => setShowCreate(true)}
                className="group flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center transition-all hover:border-slate-300"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 transition-all group-hover:bg-slate-100">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </div>
                <p className="font-medium text-slate-600">Add another cohort</p>
                <p className="mt-1 text-xs text-slate-400">
                  Scale the intelligence system
                </p>
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-100 bg-white px-6 py-6 md:px-20">
        <p className="text-center text-xs text-slate-400">
          © 2024 MEST AI Performance Intelligence. All rights reserved.
        </p>
      </footer>

      {showCreate && <CreateCohortModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

interface CohortCardProps {
  cohort: Cohort
  onEnter: (id: string) => void
}

function CohortCard({ cohort, onEnter }: CohortCardProps) {
  const isActive = cohort.status === 'active'

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

  return (
    <div
      className="group relative flex cursor-pointer flex-col rounded-xl border-2 bg-white p-6 shadow-sm transition-all"
      style={{ borderColor: isActive ? TEAL : '#e2e8f0' }}
    >
      {isActive && (
        <div
          className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ backgroundColor: TEAL }}
        >
          Active
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between">
            <span
              className="text-xs font-bold uppercase"
              style={{ color: isActive ? TEAL : '#94a3b8' }}
            >
              Year {cohort.year}
            </span>
            {!isActive && <StatusBadge status={cohort.status} />}
          </div>
          <h4 className="text-lg font-bold text-slate-900">{cohort.name}</h4>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5"
              />
            </svg>
            {formatDate(cohort.startDate)} – {formatDate(cohort.endDate)}
          </div>
        </div>

        <button
          onClick={() => onEnter(cohort.id)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-3 font-bold text-white transition-all"
          style={{ backgroundColor: isActive ? TEAL : '#64748b' }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = isActive ? TEAL_DARK : TEAL)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = isActive ? TEAL : '#64748b')
          }
        >
          {isActive ? 'Enter Cohort' : 'View Records'}
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: CohortStatus }) {
  const map: Record<CohortStatus, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-50 text-emerald-600' },
    upcoming: { label: 'Upcoming', className: 'bg-sky-50 text-sky-600' },
    completed: { label: 'Completed', className: 'bg-slate-100 text-slate-500' },
    archived: { label: 'Archived', className: 'bg-red-50 text-red-500' },
  }
  const { label, className } = map[status]
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${className}`}>
      {label}
    </span>
  )
}
