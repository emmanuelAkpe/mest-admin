import api from './client'
import type { Trainee, ApiResponse, TechnicalLevel, AiSkillLevel, MemberChange } from '@/types'

export interface TraineesQuery {
  page?: number
  limit?: number
  search?: string
  country?: string
}

export interface CreateTraineePayload {
  firstName: string
  lastName: string
  email: string
  country: string
  photo?: string
  bio?: string
  technicalBackground?: TechnicalLevel
  aiSkillLevel?: AiSkillLevel
  linkedIn?: string
  github?: string
  portfolio?: string
  entryScore?: number
  notes?: string
}

export const traineesApi = {
  listByCohort: (cohortId: string, params?: TraineesQuery) =>
    api.get<ApiResponse<Trainee[]>>(`/cohorts/${cohortId}/trainees`, {
      params,
    }),

  get: (id: string) =>
    api.get<ApiResponse<{ trainee: Trainee }>>(`/trainees/${id}`),

  create: (cohortId: string, payload: CreateTraineePayload) =>
    api.post<ApiResponse<{ trainee: Trainee }>>(
      `/cohorts/${cohortId}/trainees`,
      payload
    ),

  update: (id: string, payload: Partial<CreateTraineePayload>) =>
    api.put<ApiResponse<{ trainee: Trainee }>>(`/trainees/${id}`, payload),

  listMemberChanges: (id: string) =>
    api.get<ApiResponse<MemberChange[]>>(`/trainees/${id}/member-changes`),
}
