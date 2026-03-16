import api from './client'
import type { Cohort, ApiResponse, DashboardStats, CohortAnalytics } from '@/types'

export interface CohortsQuery {
  page?: number
  limit?: number
  status?: string
  year?: number
}

export interface CreateCohortPayload {
  name: string
  year: number
  description?: string
  startDate: string
  endDate: string
}

export const cohortsApi = {
  list: (params?: CohortsQuery) =>
    api.get<ApiResponse<Cohort[]>>('/cohorts', { params }),

  get: (id: string) =>
    api.get<ApiResponse<Cohort>>(`/cohorts/${id}`),

  create: (payload: CreateCohortPayload) =>
    api.post<ApiResponse<Cohort>>('/cohorts', payload),

  update: (id: string, payload: Partial<CreateCohortPayload>) =>
    api.put<ApiResponse<Cohort>>(`/cohorts/${id}`, payload),

  archive: (id: string) =>
    api.post<ApiResponse<Cohort>>(`/cohorts/${id}/archive`),

  stats: (id: string) =>
    api.get<ApiResponse<DashboardStats>>(`/cohorts/${id}/stats`),

  analytics: (id: string) =>
    api.get<ApiResponse<CohortAnalytics>>(`/cohorts/${id}/analytics`),
}
