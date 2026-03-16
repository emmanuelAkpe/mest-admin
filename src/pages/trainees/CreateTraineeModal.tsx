import { useState, useRef, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Camera } from 'lucide-react'
import { traineesApi, type CreateTraineePayload } from '@/api/trainees'
import { useCohortStore } from '@/store/cohort'
import type { TechnicalLevel, AiSkillLevel } from '@/types'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

const LEVELS = ['none', 'basic', 'intermediate', 'advanced'] as const

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-900'

interface Props {
  onClose: () => void
}

export function CreateTraineeModal({ onClose }: Props) {
  const { activeCohortId } = useCohortStore()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined)

  const [form, setForm] = useState<CreateTraineePayload>({
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    bio: '',
    technicalBackground: 'none',
    aiSkillLevel: 'none',
    linkedIn: '',
    github: '',
    portfolio: '',
    entryScore: undefined,
  })

  const set = (field: keyof CreateTraineePayload, value: string | number | undefined) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handlePhotoSelect = (file: File) => {
    setPhotoPreview(URL.createObjectURL(file))
    const reader = new FileReader()
    reader.onload = (e) => setPhotoBase64(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const { mutate, isPending, error } = useMutation({
    mutationFn: (payload: CreateTraineePayload) =>
      traineesApi.create(activeCohortId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainees', activeCohortId] })
      onClose()
    },
  })

  const serverError =
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const payload: CreateTraineePayload = {
      ...form,
      photo: photoBase64 || undefined,
      bio: form.bio || undefined,
      linkedIn: form.linkedIn || undefined,
      github: form.github || undefined,
      portfolio: form.portfolio || undefined,
    }
    mutate(payload)
  }

  const initials =
    form.firstName && form.lastName
      ? `${form.firstName[0]}${form.lastName[0]}`.toUpperCase()
      : form.firstName
      ? form.firstName[0].toUpperCase()
      : '?'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">Add Trainee</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="create-trainee-form" onSubmit={handleSubmit} className="space-y-6">
            {serverError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</div>
            )}

            {/* ── Photo Upload ── */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {/* Avatar preview */}
                <div
                  className="flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full text-2xl font-bold text-white"
                  style={{ backgroundColor: photoPreview ? 'transparent' : TEAL }}
                  onClick={() => fileRef.current?.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                {/* Camera badge */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white transition-colors hover:bg-slate-600"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400">Click to upload photo (optional)</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handlePhotoSelect(file)
                }}
              />
              {photoPreview && (
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-600"
                  onClick={() => { setPhotoPreview(null); setPhotoBase64(undefined) }}
                >
                  Remove photo
                </button>
              )}
            </div>

            {/* ── Required ── */}
            <section>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Required
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>First Name</label>
                  <input className={inputCls} placeholder="Kofi" required value={form.firstName}
                    onChange={(e) => set('firstName', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Last Name</label>
                  <input className={inputCls} placeholder="Mensah" required value={form.lastName}
                    onChange={(e) => set('lastName', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input className={inputCls} type="email" placeholder="kofi@example.com" required value={form.email}
                    onChange={(e) => set('email', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Country</label>
                  <input className={inputCls} placeholder="Ghana" required value={form.country}
                    onChange={(e) => set('country', e.target.value)} />
                </div>
              </div>
            </section>

            {/* ── Background ── */}
            <section>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Background
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Technical Background</label>
                  <select className={inputCls} value={form.technicalBackground}
                    onChange={(e) => set('technicalBackground', e.target.value as TechnicalLevel)}>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>AI Skill Level</label>
                  <select className={inputCls} value={form.aiSkillLevel}
                    onChange={(e) => set('aiSkillLevel', e.target.value as AiSkillLevel)}>
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    Entry Score <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input className={inputCls} type="number" min={0} max={10} step={0.1} placeholder="0–10"
                    value={form.entryScore ?? ''}
                    onChange={(e) => set('entryScore', e.target.value ? Number(e.target.value) : undefined)} />
                </div>
              </div>
            </section>

            {/* ── Profile ── */}
            <section>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Profile
              </p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>
                    Bio <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
                    placeholder="Brief background about this trainee..."
                    value={form.bio ?? ''}
                    onChange={(e) => set('bio', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className={labelCls}>LinkedIn</label>
                    <input className={inputCls} placeholder="linkedin.com/in/..." value={form.linkedIn ?? ''}
                      onChange={(e) => set('linkedIn', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>GitHub</label>
                    <input className={inputCls} placeholder="github.com/..." value={form.github ?? ''}
                      onChange={(e) => set('github', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Portfolio</label>
                    <input className={inputCls} placeholder="https://..." value={form.portfolio ?? ''}
                      onChange={(e) => set('portfolio', e.target.value)} />
                  </div>
                </div>
              </div>
            </section>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" form="create-trainee-form" disabled={isPending}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
            onMouseEnter={(e) => !isPending && (e.currentTarget.style.backgroundColor = TEAL_DARK)}
            onMouseLeave={(e) => !isPending && (e.currentTarget.style.backgroundColor = TEAL)}>
            {isPending ? 'Adding…' : 'Add Trainee'}
          </button>
        </div>
      </div>
    </div>
  )
}
