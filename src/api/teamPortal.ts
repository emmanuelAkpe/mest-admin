import publicApi from './publicClient'
import type { ApiResponse } from '@/types'

export interface TeamPortalKpi {
  kpiName: string
  scaleType: string
  scaleMax: number
  avgScore: number | null
  comments: string[]
  recommendations: string[]
}

export interface TeamPortalEvaluator {
  seed: string
  overallComment: string | null
  kpiScores: { kpiName: string; score: number | null; scaleMax: number; comment: string | null; recommendation: string | null }[]
}

export interface TeamPortalInsight {
  verdict: string | null
  strengths: string[]
  improvements: string[]
  readinessLevel: string | null
  recommendation: string | null
}

export interface TeamPortalDeliverable {
  id: string
  title: string
  description: string | null
  acceptedTypes: string[]
  deadline: string
  submitted: boolean
  submissionCount: number
  submitUrl: string
}

export interface TeamPortalEvent {
  event: { id: string; name: string; type: string; startDate: string; endDate: string }
  evaluation: {
    letter: string | null
    aiSummary: string | null
    overallAvg: number | null
    kpis: TeamPortalKpi[]
    overallComments: string[]
    evaluators: TeamPortalEvaluator[]
    insight: TeamPortalInsight | null
  }
  deliverables: TeamPortalDeliverable[]
}

export interface TeamPortalMember {
  firstName: string | null
  lastName: string | null
  photo: string | null
  roles: string[]
}

export interface TeamPortalData {
  team: {
    id: string
    name: string
    productIdea: string | null
    marketFocus: string | null
    isDissolved: boolean
    cohort: { name: string; year?: number } | null
    event: { id: string; name: string; type: string } | null
    members: TeamPortalMember[]
    mentor: { firstName: string; lastName: string } | null
    pivots: { type: string; description: string; reason: string | null; wasProactive: boolean; createdAt: string }[]
  }
  events: TeamPortalEvent[]
  mentorSessions: { date: string; notes: string | null; actionItems: string[]; mentorFirstName: string | null }[]
}

function portalHeaders(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } }
}

export const teamPortalApi = {
  requestOtp: (email: string) =>
    publicApi.post<ApiResponse<{ message: string }>>('/team-portal/request-otp', { email }),

  verifyOtp: (email: string, otp: string) =>
    publicApi.post<ApiResponse<{ accessToken: string; email: string }>>('/team-portal/verify-otp', { email, otp }),

  getMe: (token: string) =>
    publicApi.get<ApiResponse<TeamPortalData>>('/team-portal/me', portalHeaders(token)),

  logout: (token: string) =>
    publicApi.post('/team-portal/logout', {}, portalHeaders(token)),

  generateEventSummary: (token: string, eventId: string) =>
    publicApi.post<ApiResponse<{ summary: string; cached: boolean }>>(`/team-portal/events/${eventId}/ai-summary`, {}, portalHeaders(token)),

  submitDeliverable: (token: string, submissionLinkId: string, formData: FormData) =>
    publicApi.post(`/team-portal/deliverables/${submissionLinkId}/submit`, formData, {
      ...portalHeaders(token),
      headers: { ...portalHeaders(token).headers },
    }),

  deleteDeliverableSubmission: (token: string, submissionLinkId: string, submissionId: string) =>
    publicApi.delete(`/team-portal/deliverables/${submissionLinkId}/submissions/${submissionId}`, portalHeaders(token)),
}
