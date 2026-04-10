import api from './client'
import type { Trainee, ApiResponse, TechnicalLevel, AiSkillLevel, MemberChange, TraineeInsight, MentorReview, FacilitatorLog } from '@/types'

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
  education?: string
  top3Skills?: string
  coreTechSkills?: string
  industriesOfInterest?: string
  whyMEST?: string
  technicalBackground?: TechnicalLevel
  aiSkillLevel?: AiSkillLevel
  linkedIn?: string
  github?: string
  portfolio?: string
  funFact?: string
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

  getInsights: (id: string) =>
    api.get<ApiResponse<TraineeInsight>>(`/trainees/${id}/insights`),

  generateInsights: (id: string) =>
    api.post<ApiResponse<TraineeInsight>>(`/trainees/${id}/insights/generate`),

  listMentorReviews: (id: string) =>
    api.get<ApiResponse<MentorReview[]>>(`/trainees/${id}/mentor-reviews`),

  createMentorReview: (id: string, payload: { content: string; rating?: number }) =>
    api.post<ApiResponse<MentorReview>>(`/trainees/${id}/mentor-reviews`, payload),

  listFacilitatorLogs: (id: string) =>
    api.get<ApiResponse<FacilitatorLog[]>>(`/trainees/${id}/facilitator-logs`),

  createFacilitatorLog: (id: string, payload: { note: string }) =>
    api.post<ApiResponse<FacilitatorLog>>(`/trainees/${id}/facilitator-logs`, payload),

  sendProfileLink: (id: string) =>
    api.post(`/trainees/${id}/profile-link`),

  revokeProfileLink: (id: string) =>
    api.delete(`/trainees/${id}/profile-link`),
}
