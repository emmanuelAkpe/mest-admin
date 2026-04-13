import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { X, Upload, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { traineesApi, type CreateTraineePayload } from '@/api/trainees'
import { useCohortStore } from '@/store/cohort'
import { useQueryClient } from '@tanstack/react-query'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

interface TraineeField {
  key: keyof CreateTraineePayload
  label: string
  required: boolean
}

const TRAINEE_FIELDS: TraineeField[] = [
  { key: 'firstName',           label: 'First Name',              required: true  },
  { key: 'lastName',            label: 'Last Name',               required: true  },
  { key: 'country',             label: 'Country',                 required: true  },
  { key: 'email',               label: 'Email',                   required: false },
  { key: 'bio',                 label: 'Experience / Bio',        required: false },
  { key: 'education',           label: 'Education',               required: false },
  { key: 'top3Skills',          label: 'Top 3 Skills',            required: false },
  { key: 'coreTechSkills',      label: 'Core Tech Skills',        required: false },
  { key: 'industriesOfInterest',label: 'Industries of Interest',  required: false },
  { key: 'whyMEST',             label: 'Why MEST',                required: false },
  { key: 'funFact',             label: 'Fun Fact',                required: false },
  { key: 'technicalBackground', label: 'Technical Background',    required: false },
  { key: 'aiSkillLevel',        label: 'AI Skill Level',          required: false },
  { key: 'entryScore',          label: 'Entry Score',             required: false },
  { key: 'linkedIn',            label: 'LinkedIn',                required: false },
  { key: 'github',              label: 'GitHub',                  required: false },
  { key: 'portfolio',           label: 'Portfolio',               required: false },
]

const AUTO_MAP: Record<string, keyof CreateTraineePayload> = {
  // First / Last name
  firstname: 'firstName',       first_name: 'firstName',       'first name': 'firstName',
  lastname: 'lastName',         last_name: 'lastName',         'last name': 'lastName',   surname: 'lastName',
  // Email
  email: 'email',               'e-mail': 'email',             'email address': 'email',
  // Country
  country: 'country',           nation: 'country',
  // Bio / experience
  bio: 'bio',                   biography: 'bio',              about: 'bio',
  experience: 'bio',            'experience/bio': 'bio',       'experience / bio': 'bio',
  // Education
  education: 'education',
  // Skills
  'top 3 skills': 'top3Skills',       top3skills: 'top3Skills',       'top3 skills': 'top3Skills',
  'core tech skills': 'coreTechSkills', coretechskills: 'coreTechSkills', 'core tech': 'coreTechSkills',
  'tech skills': 'coreTechSkills',
  // Industries
  'industries of interest': 'industriesOfInterest', industriesofinterest: 'industriesOfInterest',
  industries: 'industriesOfInterest',
  // Why MEST
  'why mest': 'whyMEST',        whymest: 'whyMEST',
  // Fun fact
  'fun fact': 'funFact',        funfact: 'funFact',
  // Technical levels
  technicalbackground: 'technicalBackground', technical: 'technicalBackground',
  aiskill: 'aiSkillLevel',      aiskilllevel: 'aiSkillLevel',  'ai skill': 'aiSkillLevel',
  // Score / socials
  entryscore: 'entryScore',     'entry score': 'entryScore',   score: 'entryScore',
  linkedin: 'linkedIn',         'linkedin url': 'linkedIn',
  github: 'github',             'github url': 'github',
  portfolio: 'portfolio',       website: 'portfolio',
}

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done'

interface ImportResult { email: string; ok: boolean; error?: string }

interface Props { onClose: () => void }

export function CsvImportModal({ onClose }: Props) {
  const { activeCohortId } = useCohortStore()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({}) // traineeField → csvColumn
  const [results, setResults] = useState<ImportResult[]>([])
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const autoDetect = (headers: string[]): Record<string, string> => {
    const m: Record<string, string> = {}
    for (const h of headers) {
      const mapped = AUTO_MAP[h.toLowerCase().trim()]
      if (mapped) m[mapped] = h
    }
    return m
  }

  const parseFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? []
        setCsvHeaders(headers)
        setCsvRows(result.data)
        setMapping(autoDetect(headers))
        setStep('map')
      },
    })
  }

  const handleFile = (file: File | undefined) => {
    if (!file || !file.name.endsWith('.csv')) return
    parseFile(file)
  }

  const setMap = (field: string, col: string) =>
    setMapping((m) => ({ ...m, [field]: col }))

  const requiredsMapped = TRAINEE_FIELDS.filter((f) => f.required).every((f) => mapping[f.key])

  const buildPayload = (row: Record<string, string>): CreateTraineePayload => {
    const get = (field: keyof CreateTraineePayload) => {
      const col = mapping[field]
      return col ? (row[col] ?? '').trim() : ''
    }
    const entryRaw = get('entryScore')
    return {
      firstName:            get('firstName'),
      lastName:             get('lastName'),
      email:                get('email') || undefined,
      country:              get('country'),
      bio:                  get('bio') || undefined,
      education:            get('education') || undefined,
      top3Skills:           get('top3Skills') || undefined,
      coreTechSkills:       get('coreTechSkills') || undefined,
      industriesOfInterest: get('industriesOfInterest') || undefined,
      whyMEST:              get('whyMEST') || undefined,
      funFact:              get('funFact') || undefined,
      technicalBackground:  (get('technicalBackground') as any) || undefined,
      aiSkillLevel:         (get('aiSkillLevel') as any) || undefined,
      entryScore:           entryRaw ? Number(entryRaw) : undefined,
      linkedIn:             get('linkedIn') || undefined,
      github:               get('github') || undefined,
      portfolio:            get('portfolio') || undefined,
    }
  }

  const runImport = async () => {
    setStep('importing')
    const res: ImportResult[] = []
    for (let i = 0; i < csvRows.length; i++) {
      const payload = buildPayload(csvRows[i])
      try {
        await traineesApi.create(activeCohortId!, payload)
        res.push({ email: payload.email, ok: true })
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ?? 'Failed'
        res.push({ email: payload.email, ok: false, error: msg })
      }
      setProgress(Math.round(((i + 1) / csvRows.length) * 100))
    }
    setResults(res)
    queryClient.invalidateQueries({ queryKey: ['trainees', activeCohortId] })
    setStep('done')
  }

  const inputCls = 'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]'
  const selectCls = `${inputCls} appearance-none`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-slate-900">Import from CSV</h2>
          {step !== 'upload' && (
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
              {(['upload', 'map', 'preview'] as const).map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  <span className={`font-semibold capitalize ${step === s || (step === 'importing' && s === 'preview') || step === 'done' ? 'text-[#0d968b]' : ''}`}>
                    {i + 1}. {s}
                  </span>
                  {i < 2 && <ArrowRight className="h-3 w-3" />}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 transition-all ${
                dragOver ? 'border-[#0d968b] bg-[#0d968b]/5' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <Upload className={`mb-4 h-10 w-10 ${dragOver ? 'text-[#0d968b]' : 'text-slate-300'}`} />
              <p className="font-semibold text-slate-700">Drop your CSV file here</p>
              <p className="mt-1 text-sm text-slate-400">or click to browse</p>
              <p className="mt-4 text-xs text-slate-400">Any column headers — you'll map them in the next step</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
          )}

          {/* Step 2: Map columns */}
          {step === 'map' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Map your CSV columns (<span className="font-semibold">{csvRows.length} rows</span>) to trainee fields.
                Auto-detected matches are pre-filled.
              </p>

              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-4 pb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  <span>Trainee Field</span>
                  <span>Your CSV Column</span>
                </div>
                {TRAINEE_FIELDS.map((f) => (
                  <div key={f.key} className="grid grid-cols-2 items-center gap-4 py-1">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      {f.label}
                      {f.required && <span className="text-red-400">*</span>}
                    </label>
                    <select
                      className={selectCls}
                      value={mapping[f.key] ?? ''}
                      onChange={(e) => setMap(f.key, e.target.value)}
                    >
                      <option value="">— skip —</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!requiredsMapped && (
                <p className="text-xs text-red-500">
                  Map all required fields (marked *) before continuing.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                Ready to import <span className="font-semibold">{csvRows.length} trainees</span>. Preview of first rows:
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {TRAINEE_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                        <th key={f.key} className="px-4 py-2">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {TRAINEE_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                          <td key={f.key} className="max-w-[120px] truncate px-4 py-2 text-slate-700">
                            {row[mapping[f.key]] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvRows.length > 5 && (
                <p className="text-xs text-slate-400">…and {csvRows.length - 5} more rows</p>
              )}
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <div className="w-full max-w-xs">
                <div className="mb-2 flex justify-between text-sm font-medium text-slate-700">
                  <span>Importing trainees…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: TEAL }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
                <p className="font-semibold text-slate-900">
                  Import complete — {results.filter((r) => r.ok).length}/{results.length} succeeded
                </p>
              </div>
              {results.some((r) => !r.ok) && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-red-100 bg-red-50 p-4 space-y-1">
                  {results.filter((r) => !r.ok).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span><span className="font-semibold">{r.email}</span> — {r.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          {step === 'done' ? (
            <button onClick={onClose}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: TEAL }}>
              Close
            </button>
          ) : step === 'map' ? (
            <>
              <button onClick={() => setStep('upload')}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Back
              </button>
              <button disabled={!requiredsMapped}
                onClick={() => setStep('preview')}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                style={{ backgroundColor: TEAL }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TEAL_DARK)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL)}>
                Preview
              </button>
            </>
          ) : step === 'preview' ? (
            <>
              <button onClick={() => setStep('map')}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Back
              </button>
              <button onClick={runImport}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: TEAL }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = TEAL_DARK)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = TEAL)}>
                Import {csvRows.length} Trainees
              </button>
            </>
          ) : step !== 'importing' ? (
            <button onClick={onClose}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
