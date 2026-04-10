import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Search } from 'lucide-react'
import { teamsApi, type CreateTeamPayload } from '@/api/teams'
import { traineesApi } from '@/api/trainees'
import { useCohortStore } from '@/store/cohort'
import { AvatarWithFallback } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Trainee, TeamMemberRole } from '@/types'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-900'

const ALL_ROLES: { value: TeamMemberRole; label: string }[] = [
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'cto', label: 'CTO' },
  { value: 'product', label: 'Product' },
  { value: 'business', label: 'Business' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'finance', label: 'Finance' },
  { value: 'data_ai', label: 'Data/AI' },
  { value: 'presenter', label: 'Presenter' },
]

interface MemberEntry {
  trainee: string
  roles: TeamMemberRole[]
}

interface Props {
  eventId: string
  onClose: () => void
  initialMembers?: MemberEntry[]
  takenTraineeIds?: Set<string>
}

export function CreateTeamModal({ eventId, onClose, initialMembers = [], takenTraineeIds = new Set() }: Props) {
  const { activeCohortId } = useCohortStore()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [productIdea, setProductIdea] = useState('')
  const [marketFocus, setMarketFocus] = useState('')
  const [members, setMembers] = useState<MemberEntry[]>(initialMembers)
  const [search, setSearch] = useState('')

  const { data: traineesData, isLoading: traineesLoading } = useQuery({
    queryKey: ['trainees', activeCohortId],
    queryFn: () => traineesApi.listByCohort(activeCohortId!, { limit: 200 }),
    enabled: !!activeCohortId,
  })

  const traineesRaw = traineesData?.data
  const allTrainees: Trainee[] = Array.isArray(traineesRaw)
    ? (traineesRaw as Trainee[])
    : ((traineesRaw as { data?: Trainee[] })?.data ?? [])

  const isChecked = (traineeId: string) => members.some((m) => m.trainee === traineeId)

  const filteredTrainees = allTrainees.filter((t) => {
    if (takenTraineeIds.has(t.id) && !isChecked(t.id)) return false
    const full = `${t.firstName} ${t.lastName}`.toLowerCase()
    return full.includes(search.toLowerCase())
  })

  const toggleTrainee = (traineeId: string) => {
    if (isChecked(traineeId)) {
      setMembers((prev) => prev.filter((m) => m.trainee !== traineeId))
    } else {
      setMembers((prev) => [...prev, { trainee: traineeId, roles: [] }])
    }
  }

  const toggleRole = (traineeId: string, role: TeamMemberRole) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.trainee !== traineeId) return m
        const hasRole = m.roles.includes(role)
        return {
          ...m,
          roles: hasRole ? m.roles.filter((r) => r !== role) : [...m.roles, role],
        }
      })
    )
  }

  const getRoles = (traineeId: string): TeamMemberRole[] =>
    members.find((m) => m.trainee === traineeId)?.roles ?? []

  const { mutate, isPending, error } = useMutation({
    mutationFn: (payload: CreateTeamPayload) => teamsApi.create(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', eventId] })
      onClose()
    },
  })

  const serverError =
    (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
      ?.message ?? null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const payload: CreateTeamPayload = {
      name: name.trim(),
      productIdea: productIdea.trim() || undefined,
      marketFocus: marketFocus.trim() || undefined,
      members: members.length > 0 ? members : undefined,
    }
    mutate(payload)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">New Team</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="create-team-form" onSubmit={handleSubmit} className="space-y-8">
            {serverError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {serverError}
              </div>
            )}

            {/* ── Section 1: Team Info ── */}
            <section className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Team Info
              </p>

              <div>
                <label className={labelCls}>
                  Team Name <span className="text-red-400">*</span>
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g. Team Alpha"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Product Idea{' '}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
                  placeholder="Describe the product idea..."
                  value={productIdea}
                  onChange={(e) => setProductIdea(e.target.value)}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Market Focus{' '}
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  className={inputCls}
                  placeholder="e.g. Agriculture, FinTech..."
                  value={marketFocus}
                  onChange={(e) => setMarketFocus(e.target.value)}
                />
              </div>
            </section>

            {/* ── Section 2: Members ── */}
            <section className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Members{' '}
                <span className="font-normal normal-case text-slate-400">(optional)</span>
              </p>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
                  placeholder="Search trainees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {traineesLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg p-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              )}

              {!traineesLoading && (
                <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {filteredTrainees.length === 0 && (
                    <p className="p-4 text-sm italic text-slate-400">No trainees found.</p>
                  )}
                  {filteredTrainees.map((t) => {
                    const checked = isChecked(t.id)
                    const roles = getRoles(t.id)
                    const fullName = `${t.firstName} ${t.lastName}`
                    return (
                      <div key={t.id}>
                        {/* Trainee row */}
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTrainee(t.id)}
                            className="h-4 w-4 rounded border-slate-300 accent-[#0d968b]"
                          />
                          <AvatarWithFallback src={t.photo} name={fullName} size="sm" />
                          <span className="text-sm font-medium text-slate-800">{fullName}</span>
                        </label>

                        {/* Role selection */}
                        {checked && (
                          <div className="bg-slate-50 px-4 pb-3 pt-2">
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Roles
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_ROLES.map((r) => {
                                const active = roles.includes(r.value)
                                return (
                                  <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => toggleRole(t.id, r.value)}
                                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
                                    style={
                                      active
                                        ? { backgroundColor: TEAL, color: '#fff' }
                                        : {
                                            backgroundColor: '#f1f5f9',
                                            color: '#475569',
                                          }
                                    }
                                  >
                                    {r.label}
                                  </button>
                                )
                              })}
                            </div>
                            {roles.length > 0 && (
                              <p className="mt-2 text-[10px] text-slate-400">
                                Selected: {roles.map((r) => ALL_ROLES.find((x) => x.value === r)?.label).join(', ')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {members.length > 0 && (
                <p className="text-xs text-slate-500">
                  {members.length} member{members.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-team-form"
            disabled={isPending}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
            onMouseEnter={(e) =>
              !isPending && (e.currentTarget.style.backgroundColor = TEAL_DARK)
            }
            onMouseLeave={(e) =>
              !isPending && (e.currentTarget.style.backgroundColor = TEAL)
            }
          >
            {isPending ? 'Creating…' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  )
}
