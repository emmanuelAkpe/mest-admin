import api from './client'

async function downloadCsv(url: string, filename: string) {
  const res = await api.get(url, { responseType: 'blob' })
  const blob = new Blob([res.data as BlobPart], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(a.href), 100)
}

export const exportsApi = {
  evaluations: (eventId: string) =>
    downloadCsv(`/events/${eventId}/export/evaluations`, `evaluations-${eventId}.csv`),
  submissions: (eventId: string) =>
    downloadCsv(`/events/${eventId}/export/submissions`, `submissions-${eventId}.csv`),
  trainees: (cohortId: string) =>
    downloadCsv(`/cohorts/${cohortId}/export/trainees`, `trainees-${cohortId}.csv`),
}
