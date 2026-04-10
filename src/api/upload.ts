import api from './client'
import type { ApiResponse } from '@/types'

export async function uploadFile(file: File, folder = 'uploads'): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post<ApiResponse<{ url: string; key: string }>>(
    `/upload?folder=${encodeURIComponent(folder)}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )

  const data = (res.data as { data?: { url: string } })?.data ?? (res.data as unknown as { url: string })
  return data.url
}
