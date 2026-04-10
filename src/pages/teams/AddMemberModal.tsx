import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Search, UserPlus } from 'lucide-react'
import { traineesApi } from '@/api/trainees'
import { teamsApi } from '@/api/teams' // still needed for the update mutation
import { useCohortStore } from '@/store/cohort'
import { AvatarWithFallback } from '@/components/ui/Avatar'
import { countryFlag } from '@/lib/countryFlag'
import type { Team, Trainee, TeamMemberRole } from '@/types'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

const ALL_ROLES: TeamMemberRole[] = [
  'team_lead', 'cto', 'product', 'business', 'design', 'marketing', 'finance', 'data_ai', 'presenter',
]

const ROLE_LABELS: Record<TeamMemberRole, string> = {
  team_lead: 'Team Lead', cto: 'CTO', product: 'Product', business: 'Business',
  design: 'Design', marketing: 'Marketing', finance: 'Finance', data_ai: 'Data/AI', presenter: 'Presenter',
}

interface Props {
  team: Team
  onClose: () => void
  takenTraineeIds: Set<string>
}

export function AddMemberModal({ team, onClose, takenTraineeIds }: Props) {
  const { activeCohortId } = useCohortStore()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<TeamMemberRole[]>([])

  const { data: traineesData, isLoading } = useQuery({
    queryKey: ['trainees', activeCohortId],
    queryFn: () => traineesApi.listByCohort(activeCohortId!, { limit: 100 }),
    enabled: !!activeCohortId,
  })

  const allTrainees: Trainee[] = (traineesData?.data as { data?: Trainee[] })?.data ?? []

  const inThisTeam = new Set(
    team.members.map((m) => {
      const t = m.trainee
      if (typeof t === 'string') return t
      return (t as { id?: string; _id?: string }).id || (t as { id?: string; _id?: string })._id || ''
    })
  )

  const freeTrainees = allTrainees
    .filter((t) => !inThisTeam.has(t.id) && !takenTraineeIds.has(t.id))
    .filter((t) =>
      `${t.firstName} ${t.lastName}`.toLowerCase().includes(search.toLowerCase())
    )

  const selectedTrainee = allTrainees.find((t) => t.id === selectedTraineeId)

  const { mutate, isPending, error } = useMutation({
    mutationFn: async (newMember: { trainee: string; roles: TeamMemberRole[] }) => {
      const existing = team.members.map((m) => ({
        trainee: typeof m.trainee === 'object'
          ? ((m.trainee as {id?:string;_id?:string}).id || (m.trainee as {id?:string;_id?:string})._id || '')
          : m.trainee as string,
        roles: m.roles,
      }))
      await teamsApi.update(team.id, { members: [...existing, newMember] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', team.id] })
      onClose()
    },
  })

  const toggleRole = (role: TeamMemberRole) =>
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )

  const handleAdd = () => {
    if (!selectedTraineeId) return
    mutate({ trainee: selectedTraineeId, roles: selectedRoles })
  }

  const serverError =
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold text-slate-900">Add Member to {team.name}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {serverError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search trainees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
            />
          </div>

          {/* Available trainees */}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Select Trainee
            </p>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : freeTrainees.length === 0 ? (
              <p className="py-4 text-center text-sm italic text-slate-400">
                {search ? 'No trainees match your search.' : 'All trainees are already assigned to teams for this event.'}
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {freeTrainees.map((t) => {
                  const name = `${t.firstName} ${t.lastName}`
                  const isSelected = selectedTraineeId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTraineeId(t.id)
                        setSelectedRoles([])
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                      style={isSelected ? { backgroundColor: `${TEAL}0d` } : undefined}
                    >
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-full border-2 transition-colors"
                        style={
                          isSelected
                            ? { backgroundColor: TEAL, borderColor: TEAL }
                            : { borderColor: '#cbd5e1' }
                        }
                      />
                      <AvatarWithFallback src={t.photo} name={name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                        <p className="truncate text-xs text-slate-400">
                          {countryFlag(t.country)} {t.country}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Role assignment */}
          {selectedTrainee && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Assign Roles for {selectedTrainee.firstName}
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_ROLES.map((role) => {
                  const active = selectedRoles.includes(role)
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className="rounded-full px-3 py-1 text-xs font-bold transition-all"
                      style={
                        active
                          ? { backgroundColor: TEAL, color: 'white' }
                          : { backgroundColor: '#f1f5f9', color: '#475569' }
                      }
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  )
                })}
              </div>
              {selectedRoles.length === 0 && (
                <p className="mt-2 text-xs text-amber-500">Select at least one role (optional but recommended).</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedTraineeId || isPending}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-colors"
            style={{ backgroundColor: TEAL }}
            onMouseEnter={(e) => !isPending && (e.currentTarget.style.backgroundColor = TEAL_DARK)}
            onMouseLeave={(e) => !isPending && (e.currentTarget.style.backgroundColor = TEAL)}
          >
            <UserPlus className="h-4 w-4" />
            {isPending ? 'Adding…' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  )
}
