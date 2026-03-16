import { useQuery } from '@tanstack/react-query'
import { cohortsApi } from '@/api/cohorts'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import type { Cohort, CohortStatus } from '@/types'

const statusVariant: Record<CohortStatus, 'success' | 'info' | 'neutral' | 'danger'> = {
  active: 'success',
  upcoming: 'info',
  completed: 'neutral',
  archived: 'danger',
}

export function CohortsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cohorts'],
    queryFn: () => cohortsApi.list(),
    select: (res) => res.data.data,
  })

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Cohorts</h1>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {isError && (
        <p className="text-sm text-red-500">Failed to load cohorts.</p>
      )}

      {data && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Year
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Start
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  End
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data as unknown as { cohorts: Cohort[] }).cohorts?.map((cohort) => (
                <tr key={cohort._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {cohort.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{cohort.year}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[cohort.status]}>
                      {cohort.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(cohort.startDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(cohort.endDate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
