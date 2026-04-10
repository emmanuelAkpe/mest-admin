import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import publicApi from '@/api/publicClient'
import { uploadFile } from '@/api/upload'
import { TagInput } from '@/components/TagInput'
import { TOP_SKILLS_OPTIONS, TECH_SKILLS_OPTIONS, INDUSTRIES_OPTIONS } from '@/constants/traineeOptions'

const TEAL = '#0d968b'

const TABS = ['Photo', 'Background', 'About', 'Links'] as const
type Tab = typeof TABS[number]

interface TraineeData {
  id: string
  firstName: string
  lastName: string
  photo: string | null
  bio: string
  education: string
  top3Skills: string
  coreTechSkills: string
  industriesOfInterest: string
  whyMEST: string
  linkedIn: string
  github: string
  portfolio: string
  funFact: string
}

interface FormData {
  photo: string | null
  bio: string
  education: string
  top3Skills: string
  coreTechSkills: string
  industriesOfInterest: string
  whyMEST: string
  linkedIn: string
  github: string
  portfolio: string
  funFact: string
}

function Avatar({ src, name, size = 96 }: { src: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover" />
  ) : (
    <div
      style={{ width: size, height: size, backgroundColor: TEAL, fontSize: size * 0.35 }}
      className="rounded-full flex items-center justify-center font-bold text-white"
    >
      {initials}
    </div>
  )
}

export function CompleteProfilePage() {
  const { token } = useParams<{ token: string }>()
  const fileRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<'loading' | 'form' | 'submitting' | 'success' | 'invalid'>('loading')
  const [tab, setTab] = useState<Tab>('Photo')
  const [trainee, setTrainee] = useState<TraineeData | null>(null)
  const [form, setForm] = useState<FormData>({
    photo: null, bio: '', education: '', top3Skills: '', coreTechSkills: '',
    industriesOfInterest: '', whyMEST: '', linkedIn: '', github: '', portfolio: '', funFact: '',
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }
    publicApi.get(`/complete-profile/${token}`)
      .then((res) => {
        const data = (res.data as { data: { trainee: TraineeData } }).data
        setTrainee(data.trainee)
        setForm({
          photo: data.trainee.photo,
          bio: data.trainee.bio,
          education: data.trainee.education,
          top3Skills: data.trainee.top3Skills,
          coreTechSkills: data.trainee.coreTechSkills,
          industriesOfInterest: data.trainee.industriesOfInterest,
          whyMEST: data.trainee.whyMEST,
          linkedIn: data.trainee.linkedIn,
          github: data.trainee.github,
          portfolio: data.trainee.portfolio,
          funFact: data.trainee.funFact,
        })
        setPhotoPreview(data.trainee.photo)
        setStatus('form')
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  const handlePhotoSelect = (file: File) => {
    setPhotoPreview(URL.createObjectURL(file))
    setPhotoFile(file)
  }

  const set = (field: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async () => {
    setError(null)
    setStatus('submitting')

    let photoUrl = form.photo
    if (photoFile) {
      setIsUploading(true)
      try {
        photoUrl = await uploadFile(photoFile, 'trainees')
      } catch {
        setError('Photo upload failed. Please try again.')
        setStatus('form')
        setIsUploading(false)
        return
      }
      setIsUploading(false)
    }

    try {
      await publicApi.patch(`/complete-profile/${token}`, {
        photo: photoUrl ?? undefined,
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
      })
      setStatus('success')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('form')
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0d968b] focus:ring-2 focus:ring-[#0d968b]/20 placeholder:text-slate-400'
  const textareaCls = `${inputCls} resize-none`
  const labelCls = 'mb-1.5 block text-xs font-medium text-slate-500 uppercase tracking-wider'

  const isLastTab = tab === 'Links'
  const tabIndex = TABS.indexOf(tab)

  const goNext = () => {
    if (!isLastTab) setTab(TABS[tabIndex + 1])
    else handleSubmit()
  }

  const goPrev = () => {
    if (tabIndex > 0) setTab(TABS[tabIndex - 1])
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[#0d968b]" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link invalid or expired</h1>
          <p className="text-sm text-slate-500">This profile completion link is no longer valid. Contact your MEST coordinator for a new one.</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}15` }}>
            <CheckCircle className="h-8 w-8" style={{ color: TEAL }} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Profile updated!</h1>
          <p className="text-sm text-slate-500">Your MEST profile has been saved. You can close this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MEST" className="h-4 w-auto" />
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`h-2 rounded-full transition-all ${
                t === tab ? 'w-5 bg-[#0d968b]' : i < tabIndex ? 'w-2 bg-[#0d968b]/40' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-md">
          {/* Tab heading */}
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Step {tabIndex + 1} of {TABS.length}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
              {tab === 'Photo' && `Hi ${trainee?.firstName}`}
              {tab === 'Background' && 'Your background'}
              {tab === 'About' && 'About you'}
              {tab === 'Links' && 'Your links'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {tab === 'Photo' && 'Start with a profile photo. It helps your team and mentors recognise you.'}
              {tab === 'Background' && 'Share your education, skills, and the industries you care about.'}
              {tab === 'About' && 'Tell your story. Your experience, why you joined MEST, and a fun fact.'}
              {tab === 'Links' && 'Add your social and portfolio links so others can learn more about you.'}
            </p>
          </div>

          <div className="space-y-4">
            {/* ── Photo ── */}
            {tab === 'Photo' && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
                <div className="flex flex-col items-center gap-5">
                  <div className="relative group">
                    {photoPreview
                      ? <img src={photoPreview} alt="Preview" className="h-28 w-28 rounded-full object-cover" />
                      : <Avatar src={null} name={`${trainee?.firstName} ${trainee?.lastName}`} size={112} />}
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoSelect(f) }} />
                  </div>
                  <div className="text-center">
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="text-sm font-semibold" style={{ color: TEAL }}>
                      {photoPreview ? 'Change photo' : 'Upload a photo'}
                    </button>
                    {photoPreview && (
                      <button type="button"
                        onClick={() => { setPhotoPreview(null); setPhotoFile(null); set('photo', '') }}
                        className="ml-4 text-sm text-slate-400 hover:text-red-500 transition-colors">
                        Remove
                      </button>
                    )}
                    <p className="mt-1 text-xs text-slate-400">JPG, PNG or WebP — max 10 MB</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Background ── */}
            {tab === 'Background' && (
              <>
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
                  <div>
                    <label className={labelCls}>Education</label>
                    <input value={form.education} onChange={(e) => set('education', e.target.value)}
                      placeholder="e.g. B.Sc. Computer Science, University of Ghana"
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Top 3 Skills</label>
                    <TagInput
                      value={form.top3Skills ? form.top3Skills.split(',').map((t) => t.trim()).filter(Boolean) : []}
                      onChange={(tags) => set('top3Skills', tags.join(', '))}
                      suggestions={TOP_SKILLS_OPTIONS}
                      placeholder="Type a skill…"
                      max={3}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Core Tech Skills</label>
                    <TagInput
                      value={form.coreTechSkills ? form.coreTechSkills.split(',').map((t) => t.trim()).filter(Boolean) : []}
                      onChange={(tags) => set('coreTechSkills', tags.join(', '))}
                      suggestions={TECH_SKILLS_OPTIONS}
                      placeholder="Type a technology…"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Industries of Interest</label>
                    <TagInput
                      value={form.industriesOfInterest ? form.industriesOfInterest.split(',').map((t) => t.trim()).filter(Boolean) : []}
                      onChange={(tags) => set('industriesOfInterest', tags.join(', '))}
                      suggestions={INDUSTRIES_OPTIONS}
                      placeholder="Type an industry…"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── About ── */}
            {tab === 'About' && (
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
                <div>
                  <label className={labelCls}>Experience</label>
                  <textarea value={form.bio} onChange={(e) => set('bio', e.target.value)}
                    placeholder="Your background, work experience, and what you've built…"
                    rows={4} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Why MEST?</label>
                  <textarea value={form.whyMEST} onChange={(e) => set('whyMEST', e.target.value)}
                    placeholder="Why did you choose to join MEST?"
                    rows={3} className={textareaCls} />
                </div>
                <div>
                  <label className={labelCls}>Fun Fact</label>
                  <input value={form.funFact} onChange={(e) => set('funFact', e.target.value)}
                    placeholder="Something interesting about you…"
                    className={inputCls} />
                </div>
              </div>
            )}

            {/* ── Links ── */}
            {tab === 'Links' && (
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
                <div>
                  <label className={labelCls}>LinkedIn</label>
                  <input type="url" value={form.linkedIn} onChange={(e) => set('linkedIn', e.target.value)}
                    placeholder="https://linkedin.com/in/yourname" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>GitHub</label>
                  <input type="url" value={form.github} onChange={(e) => set('github', e.target.value)}
                    placeholder="https://github.com/yourname" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Portfolio</label>
                  <input type="url" value={form.portfolio} onChange={(e) => set('portfolio', e.target.value)}
                    placeholder="https://yourportfolio.com" className={inputCls} />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-4">
        <div className="mx-auto max-w-md flex items-center gap-3">
          {tabIndex > 0 && (
            <button type="button" onClick={goPrev}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              Back
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={status === 'submitting'}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: TEAL }}
          >
            {status === 'submitting' && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLastTab
              ? (isUploading ? 'Uploading…' : status === 'submitting' ? 'Saving…' : 'Save Profile')
              : 'Next'}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          Your information is only shared with MEST program staff.
        </p>
      </div>
    </div>
  )
}
