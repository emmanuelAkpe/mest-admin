import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, CalendarDays, Target, Zap, GitBranch,
  UserPlus, Pencil, Check, X as XIcon, UserMinus, UserCheck, RefreshCw,
  MessageSquare, Trash2, ChevronDown, ChevronUp, Star, AlertCircle, TrendingUp, MessageCircle,
  Link2, Upload, Clock, Copy, CheckCheck, Film, FileText, Image, Table, Globe, File,
  Users, LayoutDashboard, History, FlameKindling, BookUser, Plus, CalendarCheck,
} from 'lucide-react'
import { teamsApi } from '@/api/teams'
import { authApi } from '@/api/auth'
import { submissionLinksApi } from '@/api/submissionLinks'
import { AvatarWithFallback } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { AddMemberModal } from './AddMemberModal'
import { GenerateSubmissionLinkModal } from '../submissions/GenerateSubmissionLinkModal'
import { countryFlag } from '@/lib/countryFlag'
import type {
  Team, Trainee, Event, Admin, PivotType, TeamMemberRole, TeamStatus,
  TeamFeedbackType, TeamFeedback, MemberChange, SubmissionLink, SubmissionFileType, MentorSession,
} from '@/types'

const TEAL = '#0d968b'

/* ── Constants ── */
const ROLE_LABELS: Record<TeamMemberRole, string> = {
  team_lead: 'Team Lead', cto: 'CTO', product: 'Product', business: 'Business',
  design: 'Design', marketing: 'Marketing', finance: 'Finance', data_ai: 'Data/AI', presenter: 'Presenter',
}
const ALL_ROLES: TeamMemberRole[] = Object.keys(ROLE_LABELS) as TeamMemberRole[]

const FILE_TYPE_META: Record<SubmissionFileType, { label: string; icon: React.ReactNode; color: string }> = {
  video:       { label: 'Video',      icon: <Film className="h-4 w-4" />,     color: '#7c3aed' },
  pdf:         { label: 'PDF',        icon: <FileText className="h-4 w-4" />, color: '#dc2626' },
  image:       { label: 'Image',      icon: <Image className="h-4 w-4" />,    color: '#0284c7' },
  slides:      { label: 'Slides/PPT', icon: <File className="h-4 w-4" />,     color: '#ea580c' },
  spreadsheet: { label: 'CSV/Excel',  icon: <Table className="h-4 w-4" />,   color: '#16a34a' },
  document:    { label: 'Document',   icon: <FileText className="h-4 w-4" />, color: '#0f766e' },
  link:        { label: 'Link',       icon: <Link2 className="h-4 w-4" />,   color: '#0d968b' },
  demo:        { label: 'Demo',       icon: <Globe className="h-4 w-4" />,   color: '#8b5cf6' },
}

const FEEDBACK_META: Record<TeamFeedbackType, { label: string; icon: React.ReactNode; cls: string }> = {
  praise:      { label: 'Praise',      icon: <Star className="h-3 w-3" />,         cls: 'bg-emerald-50 text-emerald-700' },
  concern:     { label: 'Concern',     icon: <AlertCircle className="h-3 w-3" />,   cls: 'bg-red-50 text-red-600' },
  performance: { label: 'Performance', icon: <TrendingUp className="h-3 w-3" />,    cls: 'bg-indigo-50 text-indigo-700' },
  general:     { label: 'General',     icon: <MessageCircle className="h-3 w-3" />, cls: 'bg-slate-100 text-slate-600' },
}

/* ── Helpers ── */
const formatPivotType = (type: PivotType): string => ({
  product_idea: 'Product Idea', target_market: 'Target Market', business_model: 'Business Model',
  technical_approach: 'Technical Approach', multiple: 'Multiple Changes',
}[type])

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days < 30 ? `${days}d ago` : formatDate(iso)
}

function deadlineStatus(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms < 0) return { label: 'Deadline passed', cls: 'bg-red-50 text-red-600' }
  const days = Math.floor(ms / 86400000)
  const hrs = Math.floor((ms % 86400000) / 3600000)
  if (days === 0) return { label: `${hrs}h left`, cls: 'bg-amber-50 text-amber-700' }
  if (days <= 2) return { label: `${days}d ${hrs}h left`, cls: 'bg-amber-50 text-amber-700' }
  return { label: `${days} days left`, cls: 'bg-emerald-50 text-emerald-700' }
}

function StatusBadge({ status }: { status: TeamStatus }) {
  const map: Record<TeamStatus, { label: string; cls: string; style?: React.CSSProperties }> = {
    not_started: { label: 'Not Started', cls: 'bg-slate-100 text-slate-500' },
    active:      { label: 'Active',      cls: 'text-white', style: { backgroundColor: TEAL } },
    completed:   { label: 'Completed',   cls: 'bg-blue-50 text-blue-600' },
    dissolved:   { label: 'Dissolved',   cls: 'bg-red-50 text-red-500' },
  }
  const s = map[status]
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${s.cls}`} style={s.style}>
      {s.label}
    </span>
  )
}

const REMOVE_REASONS = [
  'Joining another team',
  'Withdrew from program',
  'Scheduling conflict',
  'Personal reasons',
  'Role mismatch',
  'Performance issues',
  'Team restructuring',
  'Graduated / completed',
  'Other',
]

/* helper — works with populated objects (id or _id) or plain string IDs */
function extractId(t: unknown): string {
  if (typeof t === 'string') return t
  if (t && typeof t === 'object') {
    const o = t as Record<string, unknown>
    if (typeof o['id'] === 'string') return o['id']
    if (typeof o['_id'] === 'string') return o['_id']
  }
  return ''
}

/* ── Self-contained member row ── */
function MemberRow({ member, memberIndex, team, siblingTeams, onDone }: {
  member: Team['members'][number]
  memberIndex: number
  team: Team
  siblingTeams: Team[]
  onDone: () => void
}) {
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<'view' | 'edit' | 'remove'>('view')

  // Edit roles state
  const [roles, setRoles] = useState<TeamMemberRole[]>([...member.roles])
  const [editError, setEditError] = useState<string | null>(null)

  // Remove state
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [destinationTeamId, setDestinationTeamId] = useState('none')
  const [removeError, setRemoveError] = useState<string | null>(null)

  const trainee = member.trainee as Trainee
  const isObj = typeof trainee === 'object' && trainee !== null
  const traineeId = extractId(member.trainee)
  const fullName = isObj ? `${trainee.firstName} ${trainee.lastName}` : 'Unknown'
  const photo = isObj ? trainee.photo : null
  const country = isObj ? trainee.country : ''

  const { mutate: saveRoles, isPending: savingRoles } = useMutation({
    mutationFn: (newRoles: TeamMemberRole[]) => {
      const updated = team.members.map((m, idx) => ({
        trainee: extractId(m.trainee),
        roles: idx === memberIndex ? newRoles : m.roles,
      }))
      return teamsApi.update(team.id, { members: updated })
    },
    onSuccess: (_data, newRoles) => {
      teamsApi.logMemberChange(team.id, {
        trainee: traineeId,
        changeType: 'role_changed',
        previousRoles: member.roles,
        newRoles,
      }).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['team', team.id] })
      queryClient.invalidateQueries({ queryKey: ['team-changes', team.id] })
      setMode('view')
      setEditError(null)
    },
    onError: (e: unknown) => setEditError(e instanceof Error ? e.message : 'Failed to save roles'),
  })

  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const { mutate: removeMember, isPending: removing } = useMutation({
    mutationFn: async () => {
      const finalReason = reason === 'Other' ? customReason : reason

      // 1. Remove from current team
      const updatedCurrent = team.members
        .filter((_, idx) => idx !== memberIndex)
        .map((m) => ({ trainee: extractId(m.trainee), roles: m.roles }))
      await teamsApi.update(team.id, { members: updatedCurrent })

      // 2. Add to destination team
      if (destinationTeamId !== 'none') {
        const destTeam = siblingTeams.find((t) => extractId(t) === destinationTeamId)
        if (destTeam) {
          const existingMembers = destTeam.members.map((m) => ({
            trainee: extractId(m.trainee),
            roles: m.roles,
          }))
          await teamsApi.update(destinationTeamId, {
            members: [...existingMembers, { trainee: traineeId, roles: member.roles }],
          })
        }
      }

      // 3. Fire-and-forget history logs (non-blocking, ignore 404)
      const finalDest = destinationTeamId !== 'none' ? destinationTeamId : undefined
      teamsApi.logMemberChange(team.id, {
        trainee: traineeId,
        changeType: 'left',
        previousRoles: member.roles,
        reason: finalReason || undefined,
        destinationTeam: finalDest,
      }).catch(() => {})
      if (finalDest) {
        teamsApi.logMemberChange(finalDest, {
          trainee: traineeId,
          changeType: 'joined',
          newRoles: member.roles,
          reason: `Transferred from ${team.name}`,
        }).catch(() => {})
      }
    },
    onSuccess: () => {
      const destTeam = siblingTeams.find((t) => extractId(t) === destinationTeamId)
      const msg = destTeam
        ? `${fullName} moved to ${destTeam.name}`
        : `${fullName} removed from team`
      setSuccessMsg(msg)
      setMode('view')
      queryClient.invalidateQueries({ queryKey: ['team', team.id] })
      if (destinationTeamId !== 'none') {
        queryClient.invalidateQueries({ queryKey: ['team', destinationTeamId] })
        queryClient.invalidateQueries({ queryKey: ['teams'] })
      }
    },
    onError: (e: unknown) => setRemoveError(e instanceof Error ? e.message : 'Failed to remove member'),
  })

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <AvatarWithFallback src={photo} name={fullName} size="sm" className="mt-0.5 shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-medium text-slate-900">{fullName}</p>
            {country && <span className="text-xs text-slate-400">{countryFlag(country)} {country}</span>}
          </div>

          {/* View: role badges + optional success banner */}
          {mode === 'view' && (
            <>
              {successMsg && (
                <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5 shrink-0" />{successMsg}
                </div>
              )}
              {!successMsg && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {member.roles.length === 0
                    ? <span className="text-xs italic text-slate-400">No roles assigned</span>
                    : member.roles.map((r) => (
                      <span key={r} className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: TEAL }}>
                        {ROLE_LABELS[r]}
                      </span>
                    ))}
                </div>
              )}
            </>
          )}

          {/* Edit roles panel */}
          {mode === 'edit' && (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Edit Roles</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_ROLES.map((r) => {
                  const active = roles.includes(r)
                  return (
                    <button key={r} type="button"
                      onClick={() => setRoles((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])}
                      className="rounded-full px-2.5 py-1 text-[10px] font-bold transition-all"
                      style={active ? { backgroundColor: TEAL, color: 'white' } : { backgroundColor: '#e2e8f0', color: '#475569' }}>
                      {ROLE_LABELS[r]}
                    </button>
                  )
                })}
              </div>
              {editError && <p className="rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-600">{editError}</p>}
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditError(null); saveRoles(roles) }} disabled={savingRoles}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: TEAL }}>
                  <Check className="h-3.5 w-3.5" />{savingRoles ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setMode('view')}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  <XIcon className="h-3.5 w-3.5" />Cancel
                </button>
              </div>
            </div>
          )}

          {/* Remove confirmation panel */}
          {mode === 'remove' && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
              <p className="text-sm font-semibold text-red-700">
                Remove {isObj ? trainee.firstName : 'this member'} from {team.name}?
              </p>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-red-400">Why are they leaving?</label>
                <div className="flex flex-wrap gap-1.5">
                  {REMOVE_REASONS.map((r) => (
                    <button key={r} type="button"
                      onClick={() => { setReason(reason === r ? '' : r); if (reason === r) setDestinationTeamId('none') }}
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
                      style={reason === r
                        ? { backgroundColor: '#dc2626', color: '#fff' }
                        : { backgroundColor: '#fff', color: '#6b7280', border: '1px solid #fca5a5' }}>
                      {r}
                    </button>
                  ))}
                </div>
                {reason === 'Other' && (
                  <input type="text" placeholder="Describe the reason…" autoFocus
                    value={customReason} onChange={(e) => setCustomReason(e.target.value)}
                    className="mt-2 h-8 w-full rounded-md border border-red-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-red-400" />
                )}
              </div>

              {reason === 'Joining another team' && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-red-400">Destination team</label>
                  {siblingTeams.length === 0 ? (
                    <p className="rounded-md border border-red-100 bg-white px-3 py-2 text-xs italic text-slate-400">
                      No other teams in this event yet — move will be recorded without a destination.
                    </p>
                  ) : (
                    <select value={destinationTeamId} onChange={(e) => setDestinationTeamId(e.target.value)}
                      className="h-9 w-full rounded-md border border-red-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-red-400">
                      <option value="none">— Select destination team —</option>
                      {siblingTeams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {removeError && <p className="rounded-md bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700">{removeError}</p>}
              <div className="flex items-center gap-2">
                <button onClick={() => { setRemoveError(null); removeMember() }} disabled={removing}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  <UserMinus className="h-3.5 w-3.5" />{removing ? 'Removing…' : 'Confirm Remove'}
                </button>
                <button onClick={() => { setMode('view'); setReason(''); setRemoveError(null); setDestinationTeamId('none') }}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {mode === 'view' && (
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={() => { setRoles([...member.roles]); setMode('edit') }} title="Edit roles"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setMode('remove')} title="Remove member"
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500">
              <UserMinus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TeamProfileSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      <Skeleton className="h-5 w-28" />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <div className="flex items-start justify-between"><Skeleton className="h-8 w-48" /><Skeleton className="h-6 w-20 rounded-full" /></div>
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2"><Skeleton className="h-9 w-24 rounded-lg" /><Skeleton className="h-9 w-24 rounded-lg" /><Skeleton className="h-9 w-24 rounded-lg" /></div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

/* ══════════════════════════════════════════════
   Tabs
══════════════════════════════════════════════ */
type TabId = 'overview' | 'members' | 'submissions' | 'feedback' | 'mentor' | 'history'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',     label: 'Overview',     icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { id: 'members',      label: 'Members',      icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'submissions',  label: 'Submissions',  icon: <Upload className="h-3.5 w-3.5" /> },
  { id: 'feedback',     label: 'Feedback',     icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { id: 'mentor',       label: 'Mentor',       icon: <BookUser className="h-3.5 w-3.5" /> },
  { id: 'history',      label: 'History',      icon: <History className="h-3.5 w-3.5" /> },
]

/* ══════════════════════════════════════════════
   Page
══════════════════════════════════════════════ */
export function TeamProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showAddMember, setShowAddMember] = useState(false)

  // Team info edit
  const [editingTeam, setEditingTeam] = useState(false)
  const [editName, setEditName] = useState('')
  const [editProduct, setEditProduct] = useState('')
  const [editMarket, setEditMarket] = useState('')
  const [editTeamError, setEditTeamError] = useState<string | null>(null)

  // Dissolve
  const [showDissolve, setShowDissolve] = useState(false)
  const [dissolveError, setDissolveError] = useState<string | null>(null)

  // Feedback
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackContent, setFeedbackContent] = useState('')
  const [feedbackType, setFeedbackType] = useState<TeamFeedbackType>('general')

  // Submissions
  const [showGenerateLink, setShowGenerateLink] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)

  // Mentor
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessionDate, setSessionDate] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [sessionItems, setSessionItems] = useState('')
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [assigningMentor, setAssigningMentor] = useState(false)
  const [mentorSearch, setMentorSearch] = useState('')

  /* ── Queries ── */
  const { data, isLoading, isError } = useQuery({
    queryKey: ['team', id],
    queryFn: () => teamsApi.get(id!),
    enabled: !!id,
  })
  const teamData = (data?.data as { data?: Team | { team?: Team } })?.data
  const team: Team | undefined =
    teamData && ('id' in (teamData as object) || '_id' in (teamData as object))
      ? (teamData as Team)
      : (teamData as { team?: Team })?.team

  const eventId = team ? extractId(team.event) : null

  // Sibling teams for "moving to" dropdown
  const { data: siblingTeamsData } = useQuery({
    queryKey: ['teams', eventId],
    queryFn: () => teamsApi.listByEvent(eventId!),
    enabled: !!eventId,
  })
  const siblingTeamsRaw = (siblingTeamsData?.data as { data?: Team[] | { teams?: Team[] } })?.data
  const allEventTeams: Team[] = Array.isArray(siblingTeamsRaw)
    ? (siblingTeamsRaw as Team[])
    : (siblingTeamsRaw as { teams?: Team[] })?.teams ?? []
  const siblingTeams = allEventTeams.filter((t) => extractId(t) !== id)

  const { data: feedbackData, isLoading: feedbackLoading } = useQuery({
    queryKey: ['team-feedback', id],
    queryFn: () => teamsApi.listFeedback(id!),
    enabled: !!id,
  })
  const feedbackRaw = feedbackData?.data
  const feedbackList: TeamFeedback[] = Array.isArray(feedbackRaw)
    ? feedbackRaw : (feedbackRaw as { data?: TeamFeedback[] })?.data ?? []

  const { data: changesData } = useQuery({
    queryKey: ['team-changes', id],
    queryFn: () => teamsApi.listMemberChanges(id!),
    enabled: !!id,
  })
  const changesRaw = changesData?.data
  const memberChanges: MemberChange[] = Array.isArray(changesRaw)
    ? changesRaw : (changesRaw as { data?: MemberChange[] })?.data ?? []

  const { data: submissionsData, isLoading: submissionsLoading } = useQuery({
    queryKey: ['submission-links', id],
    queryFn: () => submissionLinksApi.listByTeam(id!),
    enabled: !!id,
  })
  const subLinksRaw = submissionsData?.data
  const submissionLinks: SubmissionLink[] = Array.isArray(subLinksRaw)
    ? subLinksRaw : (subLinksRaw as { data?: SubmissionLink[] })?.data ?? []

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['mentor-sessions', id],
    queryFn: () => teamsApi.listMentorSessions(id!),
    enabled: !!id,
  })
  const sessionsRaw = sessionsData?.data
  const mentorSessions: MentorSession[] = Array.isArray(sessionsRaw)
    ? sessionsRaw : (sessionsRaw as { data?: MentorSession[] })?.data ?? []

  const { data: adminsData } = useQuery({
    queryKey: ['admins'],
    queryFn: () => authApi.listAdmins(),
  })
  const adminsRaw = adminsData?.data
  const allAdmins: Admin[] = Array.isArray(adminsRaw)
    ? adminsRaw : (adminsRaw as { data?: Admin[] })?.data ?? []

  /* ── Mutations ── */
  const { mutate: updateTeam, isPending: updatingTeam } = useMutation({
    mutationFn: (payload: { name: string; productIdea: string; marketFocus: string }) =>
      teamsApi.update(id!, { name: payload.name, productIdea: payload.productIdea || undefined, marketFocus: payload.marketFocus || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      setEditingTeam(false)
      setEditTeamError(null)
    },
    onError: (e: unknown) => setEditTeamError(e instanceof Error ? e.message : 'Failed to update team'),
  })

  const { mutate: dissolveTeam, isPending: dissolving } = useMutation({
    mutationFn: () => teamsApi.dissolve(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team', id] }); setShowDissolve(false) },
    onError: (e: unknown) => setDissolveError(e instanceof Error ? e.message : 'Failed to dissolve team'),
  })


  const { mutate: addFeedback, isPending: addingFeedback } = useMutation({
    mutationFn: () => teamsApi.addFeedback(id!, { content: feedbackContent.trim(), type: feedbackType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-feedback', id] })
      setFeedbackContent(''); setFeedbackType('general'); setShowFeedbackForm(false)
    },
  })

  const { mutate: deleteFeedback } = useMutation({
    mutationFn: (feedbackId: string) => teamsApi.deleteFeedback(id!, feedbackId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-feedback', id] }),
  })

  const { mutate: deleteSubmissionLink } = useMutation({
    mutationFn: (linkId: string) => submissionLinksApi.delete(linkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submission-links', id] }),
  })

  const { mutate: doAssignMentor, isPending: savingMentor } = useMutation({
    mutationFn: (mentorId: string | null) => teamsApi.assignMentor(id!, mentorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] })
      setAssigningMentor(false)
      setMentorSearch('')
    },
  })

  const { mutate: logSession, isPending: loggingSession } = useMutation({
    mutationFn: () => teamsApi.createMentorSession(id!, {
      sessionDate,
      notes: sessionNotes.trim() || undefined,
      actionItems: sessionItems.split('\n').map(s => s.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-sessions', id] })
      setShowSessionForm(false)
      setSessionDate(''); setSessionNotes(''); setSessionItems(''); setSessionError(null)
    },
    onError: (e: unknown) => setSessionError(e instanceof Error ? e.message : 'Failed to log session'),
  })

  const { mutate: deleteSession } = useMutation({
    mutationFn: (sessionId: string) => teamsApi.deleteMentorSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mentor-sessions', id] }),
  })

  const copyLink = (token: string, linkId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/submit/${token}`)
    setCopiedLinkId(linkId)
    setTimeout(() => setCopiedLinkId(null), 2000)
  }

  if (isLoading) return <TeamProfileSkeleton />
  if (isError || !team) return <div className="p-8 text-sm text-red-500">Failed to load team profile.</div>

  const event = typeof team.event === 'object' ? (team.event as Event) : null
  const eventName = event?.name ?? '—'

  // Badge counts for tabs
  const tabBadges: Partial<Record<TabId, number>> = {
    members: team.members.length,
    submissions: submissionLinks.length,
    feedback: feedbackList.length,
    mentor: mentorSessions.length,
  }

  /* ══════════════════════════════════════════════
     Tab content renderers
  ══════════════════════════════════════════════ */

  // ── OVERVIEW TAB ─────────────────────────────────────────────────────────
  const overviewTab = (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {/* Product */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Product</p>
          {!team.productIdea && !team.marketFocus ? (
            <p className="text-sm italic text-slate-400">No product details recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {team.productIdea && (
                <p className="text-sm leading-relaxed text-slate-700 italic">"{team.productIdea}"</p>
              )}
              {team.marketFocus && (
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="text-sm text-slate-600">{team.marketFocus}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current members mini-list */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-semibold text-slate-900">Current Members</p>
            <button onClick={() => setActiveTab('members')}
              className="text-xs font-semibold hover:underline" style={{ color: TEAL }}>
              Manage →
            </button>
          </div>
          {team.members.length === 0 ? (
            <p className="px-5 py-4 text-sm italic text-slate-400">No members yet.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {team.members.slice(0, 5).map((m, i) => {
                const tr = m.trainee as Trainee
                const isObj = typeof tr === 'object' && tr !== null
                const name = isObj ? `${tr.firstName} ${tr.lastName}` : 'Unknown'
                return (
                  <div key={isObj ? tr.id : i} className="flex items-center gap-3 px-5 py-3">
                    <AvatarWithFallback src={isObj ? tr.photo : null} name={name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                      {m.roles.length > 0 && (
                        <p className="text-[11px] text-slate-400">{m.roles.map(r => ROLE_LABELS[r]).join(', ')}</p>
                      )}
                    </div>
                  </div>
                )
              })}
              {team.members.length > 5 && (
                <div className="px-5 py-2 text-xs text-slate-400">
                  +{team.members.length - 5} more —{' '}
                  <button onClick={() => setActiveTab('members')} className="font-semibold hover:underline" style={{ color: TEAL }}>
                    see all
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Members',     value: team.members.length },
            { label: 'Pivots',      value: team.pivots.length },
            { label: 'Submissions', value: submissionLinks.length },
            { label: 'Feedback',    value: feedbackList.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
              <p className="text-xl font-extrabold" style={{ color: TEAL }}>{value}</p>
              <p className="text-[11px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* KPI */}
        <div className="relative overflow-hidden rounded-xl bg-indigo-600 p-5 text-white shadow-lg">
          <div className="absolute right-3 top-3 opacity-20"><Zap className="h-14 w-14 rotate-12" /></div>
          <h3 className="mb-2 flex items-center gap-2 font-bold text-sm"><Zap className="h-4 w-4" /> KPI Performance</h3>
          <div className="rounded-lg border border-white/20 bg-white/10 p-3">
            <p className="text-xs font-bold uppercase opacity-80 mb-1">Status</p>
            <p className="text-sm font-bold italic">"Awaiting Evaluations"</p>
          </div>
          <p className="mt-3 text-xs leading-relaxed opacity-70">Scores populate once evaluations are submitted.</p>
        </div>

        {/* Quick info */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Quick Info</p>
          <dl className="space-y-2.5 text-sm">
            {[
              { label: 'Event', value: eventName },
              { label: 'Created', value: formatDate(team.createdAt) },
              { label: 'Last Updated', value: formatDate(team.updatedAt) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start justify-between gap-2">
                <dt className="text-xs text-slate-400 shrink-0">{label}</dt>
                <dd className="text-xs font-medium text-slate-700 text-right truncate">{value}</dd>
              </div>
            ))}
            <div className="flex items-start justify-between gap-2">
              <dt className="text-xs text-slate-400 shrink-0">Status</dt>
              <dd><StatusBadge status={team.status} /></dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )

  // ── MEMBERS TAB ──────────────────────────────────────────────────────────
  const membersTab = (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-900">
          Members
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{team.members.length}</span>
        </h2>
        <button onClick={() => setShowAddMember(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ backgroundColor: TEAL }}>
          <UserPlus className="h-3.5 w-3.5" /> Add Member
        </button>
      </div>

      {team.members.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
            <UserPlus className="h-5 w-5 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No members yet</p>
          <p className="mt-1 text-xs text-slate-400">Add trainees to get started.</p>
          <button onClick={() => setShowAddMember(true)} className="mt-4 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: TEAL }}>
            <UserPlus className="h-3.5 w-3.5" /> Add First Member
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {team.members.map((m, i) => {
            const trainee = m.trainee as Trainee
            const isObj = typeof trainee === 'object' && trainee !== null
            const rowKey = (isObj ? trainee.id : m.trainee as string) || `member-idx-${i}`
            return (
              <MemberRow
                key={rowKey}
                member={m}
                memberIndex={i}
                team={team}
                siblingTeams={siblingTeams}
                onDone={() => {}}
              />
            )
          })}
        </div>
      )}
    </div>
  )

  // ── SUBMISSIONS TAB ──────────────────────────────────────────────────────
  const submissionsTab = (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-900">Submission Requests</h2>
          <p className="mt-0.5 text-xs text-slate-400">Links shared with the team to collect files, demos, or links</p>
        </div>
        <button onClick={() => setShowGenerateLink(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ backgroundColor: TEAL }}>
          <Upload className="h-3.5 w-3.5" /> Generate Link
        </button>
      </div>

      {submissionsLoading ? (
        <div className="space-y-3 p-5">{[1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : submissionLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
            <Upload className="h-5 w-5 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No submission requests yet</p>
          <p className="mt-1 text-xs text-slate-400">Generate a link to collect videos, PDFs, demos, or any file type.</p>
          <button onClick={() => setShowGenerateLink(true)} className="mt-4 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: TEAL }}>
            <Upload className="h-3.5 w-3.5" /> Generate First Link
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {submissionLinks.map((link) => {
            const dl = deadlineStatus(link.deadline)
            const session = typeof link.event === 'object' ? (link.event as Event).name : '—'
            const isCopied = copiedLinkId === link.id
            return (
              <div key={link.id} className="px-5 py-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{link.title}</p>
                    {link.description && <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{link.description}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-400">Session: {session}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    { pending: 'bg-slate-100 text-slate-600', submitted: 'bg-emerald-50 text-emerald-700', late: 'bg-amber-50 text-amber-700', not_submitted: 'bg-red-50 text-red-600' }[link.status]
                  }`}>{link.status.replace('_', ' ')}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {link.acceptedTypes.map((t) => {
                    const meta = FILE_TYPE_META[t]
                    return (
                      <span key={t} className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: meta.color }}>
                        {meta.icon}{meta.label}
                      </span>
                    )
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${dl.cls}`}>
                    <Clock className="h-3 w-3" />
                    {dl.label} — {new Date(link.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-slate-500">{link.submissions.length} file{link.submissions.length !== 1 ? 's' : ''} submitted</span>
                </div>

                {link.submissions.length > 0 && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 divide-y divide-slate-100">
                    {link.submissions.map((sub) => {
                      const meta = FILE_TYPE_META[sub.fileType]
                      return (
                        <div key={sub.id} className="flex items-center gap-3 px-3 py-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: meta.color }}>{meta.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-slate-700">{sub.label || sub.filename || sub.url}</p>
                            <p className="text-[11px] text-slate-400">by {sub.submittedByEmail} · {timeAgo(sub.submittedAt)}</p>
                          </div>
                          <a href={sub.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-white">
                            Open
                          </a>
                          <button
                            onClick={() => submissionLinksApi.adminDeleteSubmission(link.id, sub.id).then(() => queryClient.invalidateQueries({ queryKey: ['submission-links', id] }))}
                            className="shrink-0 rounded-md p-1 text-slate-300 hover:text-red-400"
                            title="Remove submission"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button onClick={() => copyLink(link.token, link.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:border-[#0d968b] hover:text-[#0d968b]">
                    {isCopied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {isCopied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button onClick={() => deleteSubmissionLink(link.id)} className="ml-auto rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-400" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── FEEDBACK TAB ─────────────────────────────────────────────────────────
  const feedbackTab = (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-900">Facilitator Feedback</h2>
          <p className="mt-0.5 text-xs text-slate-400">Reviews and notes from admins and facilitators</p>
        </div>
        <button onClick={() => setShowFeedbackForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          style={{ backgroundColor: TEAL }}>
          <MessageSquare className="h-3.5 w-3.5" />
          {showFeedbackForm ? 'Cancel' : 'Add Feedback'}
          {showFeedbackForm ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {showFeedbackForm && (
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FEEDBACK_META) as TeamFeedbackType[]).map((t) => {
              const meta = FEEDBACK_META[t]
              const active = feedbackType === t
              return (
                <button key={t} type="button" onClick={() => setFeedbackType(t)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all ${active ? meta.cls : 'bg-white border border-slate-200 text-slate-500'}`}>
                  {meta.icon}{meta.label}
                </button>
              )
            })}
          </div>
          <textarea value={feedbackContent} onChange={(e) => setFeedbackContent(e.target.value)}
            placeholder="Write your feedback, observations, or review here…" rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b] resize-none" />
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => { setShowFeedbackForm(false); setFeedbackContent('') }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white">Discard</button>
            <button onClick={() => addFeedback()} disabled={!feedbackContent.trim() || addingFeedback}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: TEAL }}>
              <Check className="h-3.5 w-3.5" />{addingFeedback ? 'Saving…' : 'Save Feedback'}
            </button>
          </div>
        </div>
      )}

      {feedbackLoading ? (
        <div className="space-y-3 p-5">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : feedbackList.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
          <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-200" />
          <p className="text-sm font-semibold text-slate-700">No feedback yet</p>
          <p className="mt-1 text-xs text-slate-400">Be the first to add a note or review for this team.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {feedbackList.map((fb) => {
            const meta = FEEDBACK_META[fb.type]
            const author = typeof fb.createdBy === 'object' ? `${fb.createdBy.firstName} ${fb.createdBy.lastName}` : 'Admin'
            return (
              <div key={fb.id} className="group px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={`mt-0.5 flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.cls}`}>
                      {meta.icon}{meta.label}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm leading-relaxed text-slate-700">{fb.content}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{author} · {timeAgo(fb.createdAt)}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteFeedback(fb.id)} title="Delete"
                    className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── HISTORY TAB ──────────────────────────────────────────────────────────
  const historyTab = (
    <div className="space-y-5">
      {/* Member dynamics */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Member Dynamics</h2>
          <p className="mt-0.5 text-xs text-slate-400">Joins, exits, and role changes</p>
        </div>
        <div className="px-5 py-4">
          <div className="relative space-y-4 before:absolute before:left-[15px] before:top-5 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {/* Team formed */}
            <div className="relative flex gap-4">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: TEAL }}>
                <UserCheck className="h-3.5 w-3.5" />
              </div>
              <div className="pt-1">
                <p className="text-sm font-semibold text-slate-900">Team formed</p>
                <p className="text-xs text-slate-500">{team.members.length} founding member{team.members.length !== 1 ? 's' : ''} — {formatDate(team.createdAt)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {team.members.slice(0, 5).map((m, i) => {
                    const t = m.trainee as Trainee
                    return <AvatarWithFallback key={typeof t === 'object' ? t.id : i} src={typeof t === 'object' ? t.photo : null} name={typeof t === 'object' ? `${t.firstName} ${t.lastName}` : 'Member'} size="sm" />
                  })}
                  {team.members.length > 5 && <span className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: TEAL }}>+{team.members.length - 5}</span>}
                </div>
              </div>
            </div>

            {/* Member changes */}
            {memberChanges.map((change) => {
              const tr = change.trainee as Trainee
              const name = typeof tr === 'object' ? `${tr.firstName} ${tr.lastName}` : 'A member'
              const photo = typeof tr === 'object' ? tr.photo : null
              const destTeam = change.destinationTeam && typeof change.destinationTeam === 'object' ? (change.destinationTeam as Team).name : null
              const isJoin = change.changeType === 'joined'
              const isLeave = change.changeType === 'left'
              const isRoleChange = change.changeType === 'role_changed'
              const iconBg = isJoin ? TEAL : isLeave ? '#ef4444' : '#f59e0b'
              const IconEl = isJoin ? UserCheck : isLeave ? UserMinus : RefreshCw
              const label = isJoin ? 'joined the team' : isLeave ? 'left the team' : 'updated their roles'
              const prevRoles = (change.previousRoles ?? []) as TeamMemberRole[]
              const newRoles = (change.newRoles ?? []) as TeamMemberRole[]
              return (
                <div key={change.id} className="relative flex gap-4">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: iconBg }}>
                    <IconEl className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex min-w-0 flex-1 items-start gap-3 pt-1">
                    <AvatarWithFallback src={photo} name={name} size="sm" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {name} <span className="font-normal text-slate-500">{label}</span>
                      </p>
                      {isRoleChange && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                          {prevRoles.length > 0
                            ? prevRoles.map(r => (
                              <span key={r} className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-400 line-through">{ROLE_LABELS[r]}</span>
                            ))
                            : <span className="text-slate-400 italic">no roles</span>}
                          <span className="text-slate-300">→</span>
                          {newRoles.length > 0
                            ? newRoles.map(r => (
                              <span key={r} className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ backgroundColor: TEAL }}>{ROLE_LABELS[r]}</span>
                            ))
                            : <span className="text-slate-400 italic">no roles</span>}
                        </div>
                      )}
                      {destTeam && (
                        <p className="mt-0.5 text-xs text-slate-500">Moving to <span className="font-semibold text-slate-700">{destTeam}</span></p>
                      )}
                      {change.reason && <p className="mt-0.5 text-xs italic text-slate-400">"{change.reason}"</p>}
                      <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(change.createdAt)}</p>
                    </div>
                  </div>
                </div>
              )
            })}

            {memberChanges.length === 0 && (
              <div className="relative flex gap-4 opacity-40">
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <UserMinus className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="pt-1">
                  <p className="text-sm italic text-slate-400">Member join / exit events will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pivot history */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-900">Pivot History</h2>
        </div>
        {team.pivots.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <GitBranch className="mx-auto mb-2 h-8 w-8 text-slate-200" />
            <p className="text-sm italic text-slate-400">No pivots recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-4">
            {team.pivots.map((pivot, i) => (
              <div key={pivot.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: TEAL }}>{i + 1}</div>
                  {i < team.pivots.length - 1 && <div className="mt-1 w-px flex-1 bg-slate-200" />}
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: TEAL }}>{formatPivotType(pivot.type)}</span>
                    <span className="text-xs text-slate-400">{formatDate(pivot.createdAt)}</span>
                    {pivot.wasProactive && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">Proactive</span>}
                  </div>
                  <p className="text-sm text-slate-700">{pivot.description}</p>
                  {pivot.reason && <p className="mt-1 text-xs italic text-slate-500">Reason: {pivot.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── MENTOR TAB ───────────────────────────────────────────────────────────
  const currentMentor = team.mentor && typeof team.mentor === 'object' ? (team.mentor as Admin) : null
  const filteredAdmins = allAdmins.filter(a =>
    `${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(mentorSearch.toLowerCase())
  )

  const mentorTab = (
    <div className="space-y-5">
      {/* Mentor assignment */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Assigned Mentor</h2>
            <p className="mt-0.5 text-xs text-slate-400">The MEST staff member mentoring this team</p>
          </div>
          {!assigningMentor && (
            <button onClick={() => setAssigningMentor(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <Pencil className="h-3 w-3" />{currentMentor ? 'Change' : 'Assign'}
            </button>
          )}
        </div>

        {assigningMentor ? (
          <div className="p-5 space-y-3">
            <input
              value={mentorSearch}
              onChange={e => setMentorSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
            />
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 rounded-lg border border-slate-100">
              {currentMentor && (
                <button onClick={() => doAssignMentor(null)} disabled={savingMentor}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">
                  <XIcon className="h-3.5 w-3.5" /> Remove mentor assignment
                </button>
              )}
              {filteredAdmins.map(admin => {
                const isCurrent = currentMentor?.id === admin.id
                return (
                  <button key={admin.id}
                    onClick={() => doAssignMentor(admin.id)}
                    disabled={savingMentor || isCurrent}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 disabled:opacity-50 ${isCurrent ? 'bg-teal-50' : ''}`}>
                    <AvatarWithFallback src={null} name={`${admin.firstName} ${admin.lastName}`} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{admin.firstName} {admin.lastName}</p>
                      <p className="text-[11px] text-slate-400">{admin.email} · {admin.role.replace('_', ' ')}</p>
                    </div>
                    {isCurrent && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: TEAL }} />}
                  </button>
                )
              })}
              {filteredAdmins.length === 0 && (
                <p className="px-4 py-3 text-xs italic text-slate-400">No admins match your search.</p>
              )}
            </div>
            <button onClick={() => { setAssigningMentor(false); setMentorSearch('') }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        ) : (
          <div className="px-5 py-4">
            {currentMentor ? (
              <div className="flex items-center gap-3">
                <AvatarWithFallback src={null} name={`${currentMentor.firstName} ${currentMentor.lastName}`} size="md" />
                <div>
                  <p className="font-semibold text-slate-900">{currentMentor.firstName} {currentMentor.lastName}</p>
                  <p className="text-xs text-slate-400">{currentMentor.email} · {currentMentor.role.replace('_', ' ')}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">No mentor assigned yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Session log */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Mentor Sessions</h2>
            <p className="mt-0.5 text-xs text-slate-400">Meetings between the mentor and team</p>
          </div>
          <button onClick={() => setShowSessionForm(v => !v)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: TEAL }}>
            <Plus className="h-3.5 w-3.5" />
            {showSessionForm ? 'Cancel' : 'Log Session'}
            {showSessionForm ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {showSessionForm && (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Session Date *</label>
                <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Notes</label>
              <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
                rows={3} placeholder="What was discussed?"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b] resize-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Action Items <span className="font-normal text-slate-400">(one per line)</span></label>
              <textarea value={sessionItems} onChange={e => setSessionItems(e.target.value)}
                rows={3} placeholder={"Follow up on pitch deck\nReview financial model"}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b] resize-none font-mono text-xs" />
            </div>
            {sessionError && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{sessionError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => { setShowSessionForm(false); setSessionError(null) }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white">Discard</button>
              <button onClick={() => logSession()} disabled={!sessionDate || loggingSession}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: TEAL }}>
                <CalendarCheck className="h-3.5 w-3.5" />{loggingSession ? 'Saving…' : 'Save Session'}
              </button>
            </div>
          </div>
        )}

        {sessionsLoading ? (
          <div className="space-y-3 p-5">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
        ) : mentorSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 text-slate-200" />
            <p className="text-sm font-semibold text-slate-700">No sessions logged yet</p>
            <p className="mt-1 text-xs text-slate-400">Log the first mentor session above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {mentorSessions.map(session => {
              const mentor = typeof session.mentor === 'object' ? (session.mentor as Admin) : null
              const loggedBy = typeof session.loggedBy === 'object' ? (session.loggedBy as Admin) : null
              const date = new Date(session.sessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              return (
                <div key={session.id} className="group px-5 py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-900">{date}</span>
                      {mentor && (
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {mentor.firstName} {mentor.lastName}
                        </span>
                      )}
                    </div>
                    <button onClick={() => deleteSession(session.id)} title="Delete"
                      className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {session.notes && (
                    <p className="text-sm leading-relaxed text-slate-600 pl-5">{session.notes}</p>
                  )}
                  {session.actionItems.length > 0 && (
                    <ul className="pl-5 space-y-1">
                      {session.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="h-3 w-3 shrink-0 mt-0.5 text-teal-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {loggedBy && (
                    <p className="pl-5 text-[11px] text-slate-400">Logged by {loggedBy.firstName} {loggedBy.lastName} · {timeAgo(session.createdAt)}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  /* ── Render ── */
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Teams
      </button>

      {/* Header */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        {editingTeam ? (
          /* ── Inline edit form ── */
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Edit Team Info</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Team Name *</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Market Focus</label>
                <input value={editMarket} onChange={(e) => setEditMarket(e.target.value)}
                  placeholder="Target audience / market…"
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Product Idea</label>
              <textarea value={editProduct} onChange={(e) => setEditProduct(e.target.value)}
                rows={2} placeholder="Describe the product or service idea…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b] resize-none" />
            </div>
            {editTeamError && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{editTeamError}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setEditTeamError(null); updateTeam({ name: editName.trim(), productIdea: editProduct.trim(), marketFocus: editMarket.trim() }) }}
                disabled={!editName.trim() || updatingTeam}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: TEAL }}>
                <Check className="h-3.5 w-3.5" />{updatingTeam ? 'Saving…' : 'Save Changes'}
              </button>
              <button onClick={() => { setEditingTeam(false); setEditTeamError(null) }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        ) : showDissolve ? (
          /* ── Dissolve confirmation ── */
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
            <p className="font-semibold text-red-700">Dissolve "{team.name}"?</p>
            <p className="text-sm text-red-600">This marks the team as dissolved and is difficult to reverse. Members are not removed but the team will no longer be active.</p>
            {dissolveError && <p className="text-xs text-red-700 font-medium">{dissolveError}</p>}
            <div className="flex items-center gap-2 pt-1">
              <button onClick={() => { setDissolveError(null); dissolveTeam() }} disabled={dissolving}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                <FlameKindling className="h-3.5 w-3.5" />{dissolving ? 'Dissolving…' : 'Yes, dissolve'}
              </button>
              <button onClick={() => { setShowDissolve(false); setDissolveError(null) }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ── Normal header ── */
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{team.name}</h1>
              <div className="flex items-center gap-2">
                <StatusBadge status={team.status} />
                {team.status !== 'dissolved' && (
                  <>
                    <button
                      onClick={() => { setEditName(team.name); setEditProduct(team.productIdea ?? ''); setEditMarket(team.marketFocus ?? ''); setEditingTeam(true) }}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => setShowDissolve(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">
                      <Trash2 className="h-3 w-3" /> Dissolve
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{eventName}</span>
              </div>
              {team.productIdea && <p className="text-sm italic text-slate-500 line-clamp-1">"{team.productIdea}"</p>}
            </div>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const badge = tabBadges[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {badge !== undefined && badge > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'text-white' : 'bg-slate-200 text-slate-500'}`}
                  style={isActive ? { backgroundColor: TEAL } : undefined}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'overview'    && overviewTab}
      {activeTab === 'members'     && membersTab}
      {activeTab === 'submissions' && submissionsTab}
      {activeTab === 'feedback'    && feedbackTab}
      {activeTab === 'mentor'      && mentorTab}
      {activeTab === 'history'     && historyTab}

      {showAddMember && (() => {
        const takenTraineeIds = new Set<string>()
        allEventTeams.filter(t => extractId(t) !== team.id).forEach(t => {
          t.members.forEach(m => { const tid = extractId(m.trainee); if (tid) takenTraineeIds.add(tid) })
        })
        return <AddMemberModal team={team} takenTraineeIds={takenTraineeIds} onClose={() => setShowAddMember(false)} />
      })()}
      {showGenerateLink && (
        <GenerateSubmissionLinkModal
          team={team}
          onClose={() => setShowGenerateLink(false)}
          onSuccess={() => {
            setShowGenerateLink(false)
            queryClient.invalidateQueries({ queryKey: ['submission-links', id] })
          }}
        />
      )}
    </div>
  )
}
