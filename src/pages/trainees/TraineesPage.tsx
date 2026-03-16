import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { UserPlus, Upload, Users, ExternalLink } from 'lucide-react'
import { traineesApi } from '@/api/trainees'
import { useCohortStore } from '@/store/cohort'
import { AvatarWithFallback } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { countryFlag } from '@/lib/countryFlag'
import { CreateTraineeModal } from './CreateTraineeModal'
import { CsvImportModal } from './CsvImportModal'
import type { Trainee } from '@/types'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100">
          <td className="px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </td>
          <td className="px-4 py-4 sm:px-6"><Skeleton className="h-3.5 w-20" /></td>
          <td className="hidden px-4 py-4 sm:table-cell sm:px-6"><Skeleton className="h-3.5 w-16" /></td>
          <td className="hidden px-4 py-4 md:table-cell md:px-6"><Skeleton className="h-3.5 w-16" /></td>
          <td className="hidden px-4 py-4 lg:table-cell lg:px-6"><Skeleton className="h-3.5 w-12" /></td>
          <td className="px-4 py-4 sm:px-6"><Skeleton className="h-5 w-14 rounded-full" /></td>
        </tr>
      ))}
    </>
  )
}

export function TraineesPage() {
  const { activeCohortId } = useCohortStore()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['trainees', activeCohortId],
    queryFn: () => traineesApi.listByCohort(activeCohortId!, { limit: 100 }),
    enabled: !!activeCohortId,
  })

  const trainees: Trainee[] =
    (data?.data as { data?: Trainee[] })?.data ?? []

  if (!activeCohortId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Users className="h-12 w-12 text-slate-200" />
        <div>
          <p className="font-semibold text-slate-700">No cohort selected</p>
          <p className="mt-1 text-sm text-slate-400">Select a cohort from the top bar to view its trainees.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Trainees</h1>
          {!isLoading && (
            <p className="text-sm text-slate-500">{trainees.length} enrolled</p>
          )}
          {isLoading && <Skeleton className="mt-1 h-4 w-24" />}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:px-4"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import CSV</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition-colors sm:px-4"
            style={{ backgroundColor: TEAL }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TEAL_DARK)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL)}
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Trainee</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-red-500">Failed to load trainees.</p>
      )}

      {/* Empty state */}
      {!isLoading && !isError && trainees.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
            <Users className="h-7 w-7 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-700">No trainees yet</p>
          <p className="mt-1 text-sm text-slate-400">Add trainees one by one or import a CSV file.</p>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              Import CSV
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: TEAL }}
            >
              <UserPlus className="h-4 w-4" />
              Add Trainee
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {(isLoading || trainees.length > 0) && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 sm:px-6">Name</th>
                  <th className="px-4 py-3 sm:px-6">Country</th>
                  <th className="hidden px-4 py-3 sm:table-cell sm:px-6">Tech Level</th>
                  <th className="hidden px-4 py-3 md:table-cell md:px-6">AI Level</th>
                  <th className="hidden px-4 py-3 lg:table-cell lg:px-6">Entry Score</th>
                  <th className="px-4 py-3 sm:px-6">Status</th>
                  <th className="px-4 py-3 sm:px-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <TableSkeleton />
                ) : (
                  trainees.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/trainees/${t.id}`)}
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <AvatarWithFallback
                            src={t.photo}
                            name={`${t.firstName} ${t.lastName}`}
                            size="sm"
                          />
                          <div>
                            <p className="font-semibold text-slate-900">{t.firstName} {t.lastName}</p>
                            <p className="text-xs text-slate-400">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          {countryFlag(t.country) && (
                            <span className="text-base leading-none">{countryFlag(t.country)}</span>
                          )}
                          {t.country}
                        </span>
                      </td>
                      <td className="hidden px-4 py-4 capitalize text-slate-600 sm:table-cell sm:px-6">{t.technicalBackground}</td>
                      <td className="hidden px-4 py-4 capitalize text-slate-600 md:table-cell md:px-6">{t.aiSkillLevel}</td>
                      <td className="hidden px-4 py-4 text-slate-600 lg:table-cell lg:px-6">{t.entryScore !== null ? t.entryScore : '—'}</td>
                      <td className="px-4 py-4 sm:px-6">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          t.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 sm:px-6" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/trainees/${t.id}`)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#0d968b] hover:text-[#0d968b]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <CreateTraineeModal onClose={() => setShowCreate(false)} />}
      {showImport && <CsvImportModal onClose={() => setShowImport(false)} />}
    </div>
  )
}
