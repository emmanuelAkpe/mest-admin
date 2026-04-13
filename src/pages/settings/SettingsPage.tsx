import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  User, Lock, Users, Check, Eye, EyeOff, Loader2,
  Upload, Pencil, Mail, ShieldCheck, UserPlus, RefreshCw, X,
} from 'lucide-react'
import { authApi } from '@/api/auth'
import { uploadFile } from '@/api/upload'
import { useAuthStore } from '@/store/auth'
import { AvatarWithFallback } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Admin, AdminRole } from '@/types'

const TEAL = '#0d968b'

type TabId = 'profile' | 'security' | 'team'

const ROLE_META: Record<AdminRole, { label: string; cls: string }> = {
  super_admin:   { label: 'Super Admin',   cls: 'bg-violet-100 text-violet-700' },
  program_admin: { label: 'Program Admin', cls: 'bg-teal-50 text-teal-700' },
  mentor:        { label: 'Mentor',        cls: 'bg-amber-50 text-amber-700' },
}

function RoleBadge({ role }: { role: AdminRole }) {
  const meta = ROLE_META[role] ?? { label: role, cls: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

/* ── Profile Tab ─────────────────────────────────────────────────────────── */
function ProfileTab() {
  const { admin, updateAdmin } = useAuthStore()
  const [firstName, setFirstName] = useState(admin?.firstName ?? '')
  const [lastName, setLastName] = useState(admin?.lastName ?? '')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { mutate: saveProfile, isPending: saving } = useMutation({
    mutationFn: (photo?: string | null) =>
      authApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(photo !== undefined ? { photo } : {}),
      }),
    onSuccess: (res) => {
      const updated = (res.data as { data?: Admin })?.data ?? (res.data as unknown as Admin)
      updateAdmin(updated)
      setSaved(true)
      setError(null)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Failed to save profile'),
  })

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setError(null)
    try {
      const url = await uploadFile(file, 'admin-photos')
      saveProfile(url)
    } catch {
      setError('Photo upload failed. Please try again.')
    } finally {
      setUploadingPhoto(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <AvatarWithFallback
            src={admin?.photo ?? null}
            name={`${admin?.firstName} ${admin?.lastName}`}
            size="xl"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto || saving}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white shadow-md disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
            title="Upload photo"
          >
            {uploadingPhoto ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
        <div>
          <p className="font-bold text-slate-900">{admin?.firstName} {admin?.lastName}</p>
          <p className="text-sm text-slate-500">{admin?.email}</p>
          <div className="mt-1.5"><RoleBadge role={admin?.role ?? 'program_admin'} /></div>
        </div>
      </div>

      {/* Name fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">First Name</label>
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Last Name</label>
          <input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Email</label>
        <div className="flex h-9 items-center rounded-lg border border-slate-100 bg-slate-50 px-3 text-sm text-slate-400 gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {admin?.email}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Email cannot be changed here. Contact a super admin.</p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <button
        onClick={() => saveProfile(undefined)}
        disabled={saving || uploadingPhoto || !firstName.trim() || !lastName.trim()}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        style={{ backgroundColor: TEAL }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Profile'}
      </button>
    </div>
  )
}

/* ── Security Tab ────────────────────────────────────────────────────────── */
function SecurityTab() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { mutate: changePassword, isPending } = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      setSuccess(true)
      setError(null)
      setCurrent(''); setNext(''); setConfirm('')
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Failed to change password'),
  })

  const canSubmit = current && next && confirm && next === confirm && next.length >= 8

  return (
    <div className="space-y-5 max-w-md">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Current Password</label>
        <div className="relative">
          <input
            type={showCurrent ? 'text' : 'password'}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-9 text-sm text-slate-900 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
          />
          <button type="button" onClick={() => setShowCurrent(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">New Password</label>
        <div className="relative">
          <input
            type={showNext ? 'text' : 'password'}
            value={next}
            onChange={e => setNext(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 px-3 pr-9 text-sm text-slate-900 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
          />
          <button type="button" onClick={() => setShowNext(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {next && next.length < 8 && (
          <p className="mt-1 text-[11px] text-amber-600">Must be at least 8 characters</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Confirm New Password</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
        />
        {confirm && next !== confirm && (
          <p className="mt-1 text-[11px] text-red-500">Passwords do not match</p>
        )}
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
      {success && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 font-medium">
          Password changed. You'll need to log in again on other devices.
        </p>
      )}

      <button
        onClick={() => { setError(null); setSuccess(false); changePassword() }}
        disabled={!canSubmit || isPending}
        className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        style={{ backgroundColor: TEAL }}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {isPending ? 'Changing…' : 'Change Password'}
      </button>
    </div>
  )
}

/* ── Team Tab ─────────────────────────────────────────────────────────────── */
function TeamTab() {
  const queryClient = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)
  const [inviteFirst, setInviteFirst] = useState('')
  const [inviteLast, setInviteLast] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<AdminRole>('program_admin')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => authApi.listAdmins(),
  })
  const adminsRaw = data?.data
  const admins: Admin[] = Array.isArray(adminsRaw)
    ? adminsRaw : (adminsRaw as { data?: Admin[] })?.data ?? []

  const { mutate: invite, isPending: inviting } = useMutation({
    mutationFn: () => authApi.invite({ firstName: inviteFirst.trim(), lastName: inviteLast.trim(), email: inviteEmail.trim(), role: inviteRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] })
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}`)
      setInviteError(null)
      setInviteFirst(''); setInviteLast(''); setInviteEmail(''); setInviteRole('program_admin')
      setTimeout(() => { setShowInvite(false); setInviteSuccess(null) }, 2000)
    },
    onError: (e: unknown) => setInviteError(e instanceof Error ? e.message : 'Failed to send invite'),
  })

  const { mutate: resend } = useMutation({
    mutationFn: (adminId: string) => authApi.resendInvite(adminId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admins'] }),
  })

  const canInvite = inviteFirst.trim() && inviteLast.trim() && inviteEmail.trim().includes('@')

  return (
    <div className="space-y-5">
      {/* Invite form */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Admin Team</h3>
            <p className="mt-0.5 text-xs text-slate-400">All active and pending admins</p>
          </div>
          <button
            onClick={() => { setShowInvite(v => !v); setInviteError(null); setInviteSuccess(null) }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: TEAL }}
          >
            {showInvite ? <X className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            {showInvite ? 'Cancel' : 'Invite Admin'}
          </button>
        </div>

        {showInvite && (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">First Name *</label>
                <input value={inviteFirst} onChange={e => setInviteFirst(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Last Name *</label>
                <input value={inviteLast} onChange={e => setInviteLast(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Email *</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as AdminRole)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]">
                <option value="program_admin">Program Admin</option>
                <option value="mentor">Mentor</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            {inviteError && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{inviteError}</p>}
            {inviteSuccess && <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 font-medium">{inviteSuccess}</p>}
            <div className="flex justify-end">
              <button onClick={() => { setInviteError(null); invite() }}
                disabled={!canInvite || inviting}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: TEAL }}>
                {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                {inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3 p-5">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : admins.length === 0 ? (
          <p className="px-5 py-6 text-sm italic text-slate-400">No admins found.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center gap-3 px-5 py-3">
                <AvatarWithFallback src={admin.photo ?? null} name={`${admin.firstName} ${admin.lastName}`} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{admin.firstName} {admin.lastName}</p>
                    <RoleBadge role={admin.role} />
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{admin.email}</p>
                </div>
                {admin.isActive === false && (
                  <button onClick={() => resend(admin.id)}
                    className="flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100">
                    <RefreshCw className="h-2.5 w-2.5" /> Resend
                  </button>
                )}
                {admin.isActive && <ShieldCheck className="h-4 w-4 shrink-0 text-teal-400" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export function SettingsPage() {
  const { admin } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',  label: 'My Profile',  icon: <User className="h-4 w-4" /> },
    { id: 'security', label: 'Security',     icon: <Lock className="h-4 w-4" /> },
    ...(admin?.role === 'super_admin'
      ? [{ id: 'team' as TabId, label: 'Admin Team', icon: <Users className="h-4 w-4" /> }]
      : []),
  ]

  return (
    <div className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your profile, security, and team</p>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {tab.icon}{tab.label}
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab === 'profile'  && <ProfileTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'team'     && <TeamTab />}
      </div>
    </div>
  )
}
