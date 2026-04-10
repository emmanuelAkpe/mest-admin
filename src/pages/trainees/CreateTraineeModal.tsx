import { useState, useRef, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Camera, Loader2 } from 'lucide-react'
import { traineesApi, type CreateTraineePayload } from '@/api/trainees'
import { uploadFile } from '@/api/upload'
import { useCohortStore } from '@/store/cohort'
import { TagInput } from '@/components/TagInput'
import { TOP_SKILLS_OPTIONS, TECH_SKILLS_OPTIONS, INDUSTRIES_OPTIONS } from '@/constants/traineeOptions'
import type { TechnicalLevel, AiSkillLevel } from '@/types'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

const LEVELS = ['none', 'basic', 'intermediate', 'advanced'] as const
const TABS = ['Basics', 'Background', 'Profile', 'Links'] as const
type Tab = typeof TABS[number]

const inputCls =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]'
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-900'
const textareaCls =
  'w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]'

const toTags = (s: string | undefined) => s ? s.split(',').map((t) => t.trim()).filter(Boolean) : []
const fromTags = (tags: string[]) => tags.join(', ')

interface Props {
  onClose: () => void
}

export function CreateTraineeModal({ onClose }: Props) {
  const { activeCohortId } = useCohortStore()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('Basics')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [sendProfileLink, setSendProfileLink] = useState(true)

  const [form, setForm] = useState<CreateTraineePayload>({
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    bio: '',
    education: '',
    top3Skills: '',
    coreTechSkills: '',
    industriesOfInterest: '',
    whyMEST: '',
    technicalBackground: 'none',
    aiSkillLevel: 'none',
    linkedIn: '',
    github: '',
    portfolio: '',
    funFact: '',
    entryScore: undefined,
  })

  const set = (field: keyof CreateTraineePayload, value: string | number | undefined) =>
    setForm((f) => ({ ...f, [field]: value }))

  const setTags = (field: 'top3Skills' | 'coreTechSkills' | 'industriesOfInterest') =>
    (tags: string[]) => set(field, fromTags(tags))

  const handlePhotoSelect = (file: File) => {
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoFile(file)
  }

  const { mutate, isPending, error } = useMutation({
    mutationFn: (payload: CreateTraineePayload) =>
      traineesApi.create(activeCohortId!, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['trainees', activeCohortId] })
      if (sendProfileLink) {
        const traineeId = (res.data as { data?: { id?: string } })?.data?.id
        if (traineeId) traineesApi.sendProfileLink(traineeId).catch(() => {})
      }
      onClose()
    },
  })

  const serverError =
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    let photoUrl: string | undefined
    if (photoFile) {
      setIsUploading(true)
      try {
        photoUrl = await uploadFile(photoFile, 'trainees')
      } finally {
        setIsUploading(false)
      }
    }
    const payload: CreateTraineePayload = {
      ...form,
      photo: photoUrl || undefined,
      bio: form.bio || undefined,
      education: form.education || undefined,
      top3Skills: form.top3Skills || undefined,
      coreTechSkills: form.coreTechSkills || undefined,
      industriesOfInterest: form.industriesOfInterest || undefined,
      whyMEST: form.whyMEST || undefined,
      linkedIn: form.linkedIn || undefined,
      github: form.github || undefined,
      portfolio: form.portfolio || undefined,
      funFact: form.funFact || undefined,
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

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px mr-6 border-b-2 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? 'border-[#0d968b] text-[#0d968b]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="create-trainee-form" onSubmit={handleSubmit}>
            {serverError && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</div>
            )}

            {/* ── Basics ── */}
            {tab === 'Basics' && (
              <div className="space-y-5">
                {/* Photo */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
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
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-white transition-colors hover:bg-slate-600"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">Click to upload photo (optional)</p>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handlePhotoSelect(file) }} />
                  {photoPreview && (
                    <button type="button" className="text-xs text-red-400 hover:text-red-600"
                      onClick={() => { setPhotoPreview(null); setPhotoFile(null) }}>
                      Remove photo
                    </button>
                  )}
                </div>

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
              </div>
            )}

            {/* ── Background ── */}
            {tab === 'Background' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Technical Level</label>
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
                  <div className="md:col-span-2">
                    <label className={labelCls}>
                      Entry Score <span className="font-normal text-slate-400">(optional, 0–10)</span>
                    </label>
                    <input className={inputCls} type="number" min={0} max={10} step={0.1} placeholder="e.g. 7.5"
                      value={form.entryScore ?? ''}
                      onChange={(e) => set('entryScore', e.target.value ? Number(e.target.value) : undefined)} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    Top 3 Skills <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <TagInput
                    value={toTags(form.top3Skills)}
                    onChange={setTags('top3Skills')}
                    suggestions={TOP_SKILLS_OPTIONS}
                    placeholder="Type a skill…"
                    max={3}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Core Tech Skills <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <TagInput
                    value={toTags(form.coreTechSkills)}
                    onChange={setTags('coreTechSkills')}
                    suggestions={TECH_SKILLS_OPTIONS}
                    placeholder="Type a technology…"
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Industries of Interest <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <TagInput
                    value={toTags(form.industriesOfInterest)}
                    onChange={setTags('industriesOfInterest')}
                    suggestions={INDUSTRIES_OPTIONS}
                    placeholder="Type an industry…"
                  />
                </div>
              </div>
            )}

            {/* ── Profile ── */}
            {tab === 'Profile' && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>
                    Education <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input className={inputCls} placeholder="B.Sc. Computer Science, University of Ghana" value={form.education ?? ''}
                    onChange={(e) => set('education', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>
                    Experience / Bio <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea rows={4} className={textareaCls}
                    placeholder="Brief background about this trainee..."
                    value={form.bio ?? ''}
                    onChange={(e) => set('bio', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Why MEST? <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea rows={3} className={textareaCls}
                    placeholder="Their reason for joining MEST..."
                    value={form.whyMEST ?? ''}
                    onChange={(e) => set('whyMEST', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Fun Fact <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input className={inputCls} placeholder="A fun fact about this trainee..." value={form.funFact ?? ''}
                    onChange={(e) => set('funFact', e.target.value)} />
                </div>
              </div>
            )}

            {/* ── Links ── */}
            {tab === 'Links' && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>LinkedIn</label>
                  <input className={inputCls} placeholder="https://linkedin.com/in/..." value={form.linkedIn ?? ''}
                    onChange={(e) => set('linkedIn', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>GitHub</label>
                  <input className={inputCls} placeholder="https://github.com/..." value={form.github ?? ''}
                    onChange={(e) => set('github', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Portfolio</label>
                  <input className={inputCls} placeholder="https://..." value={form.portfolio ?? ''}
                    onChange={(e) => set('portfolio', e.target.value)} />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendProfileLink}
              onChange={(e) => setSendProfileLink(e.target.checked)}
              className="h-4 w-4 rounded accent-[#0d968b]"
            />
            <span className="text-xs text-slate-500">Send profile completion email</span>
          </label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" form="create-trainee-form" disabled={isPending || isUploading}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: TEAL }}
              onMouseEnter={(e) => !(isPending || isUploading) && (e.currentTarget.style.backgroundColor = TEAL_DARK)}
              onMouseLeave={(e) => !(isPending || isUploading) && (e.currentTarget.style.backgroundColor = TEAL)}>
              {(isPending || isUploading) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isUploading ? 'Uploading photo…' : isPending ? 'Adding…' : 'Add Trainee'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
