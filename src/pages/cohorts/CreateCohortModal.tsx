import { useState, type FormEvent, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cohortsApi, type CreateCohortPayload } from '@/api/cohorts'
import { DatePicker } from '@/components/ui/DatePicker'

const TEAL = '#0d968b'
const TEAL_DARK = '#0b847a'

interface Props {
  onClose: () => void
}

export function CreateCohortModal({ onClose }: Props) {
  const queryClient = useQueryClient()

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i)

  const [name, setName] = useState('')
  const [year, setYear] = useState(currentYear)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [fieldError, setFieldError] = useState('')

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const { mutate, isPending, error } = useMutation({
    mutationFn: (payload: CreateCohortPayload) => cohortsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohorts'] })
      onClose()
    },
  })

  const serverError =
    (error as { response?: { data?: { error?: { message?: string } } } })
      ?.response?.data?.error?.message ?? null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFieldError('')

    if (!startDate || !endDate) {
      setFieldError('Please select both start and end dates.')
      return
    }

    if (new Date(endDate) <= new Date(startDate)) {
      setFieldError('End date must be after start date.')
      return
    }

    mutate({ name, year, startDate, endDate, description: description || undefined })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">Create New Cohort</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <form id="create-cohort-form" onSubmit={handleSubmit} className="space-y-8">
            {(fieldError || serverError) && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {fieldError || serverError}
              </div>
            )}

            <section>
              <p className="mb-6 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Basic Information
              </p>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-900">
                    Cohort Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., EIT 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-900">Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    required
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-900">
                    Start Date
                  </label>
                  <DatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Pick start date"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-900">
                    End Date
                  </label>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Pick end date"
                    disabled={startDate ? (date) => date <= new Date(startDate) : undefined}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-900">
                    Description
                    <span className="ml-1 font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Define cohort goals and specific criteria..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#0d968b] focus:ring-1 focus:ring-[#0d968b]"
                  />
                </div>
              </div>
            </section>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-cohort-form"
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
            onMouseEnter={(e) =>
              !isPending && (e.currentTarget.style.backgroundColor = TEAL_DARK)
            }
            onMouseLeave={(e) =>
              !isPending && (e.currentTarget.style.backgroundColor = TEAL)
            }
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {isPending ? 'Creating…' : 'Create Cohort'}
          </button>
        </div>
      </div>
    </div>
  )
}
