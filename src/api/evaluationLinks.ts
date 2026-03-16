import api from './client'
import type { EvaluationLink, ApiResponse } from '@/types'

export interface CreateEvaluationLinkPayload {
  evaluatorName: string
  evaluatorEmail?: string
  teams: string[]
  expiresAt: string
}

export const evaluationLinksApi = {
  listByEvent: (eventId: string) =>
    api.get<ApiResponse<{ links: EvaluationLink[] }>>(
      `/events/${eventId}/evaluation-links`
    ),

  results: (eventId: string) =>
    api.get<ApiResponse<unknown>>(`/events/${eventId}/evaluation-links/results`),

  create: (eventId: string, payload: CreateEvaluationLinkPayload) =>
    api.post<ApiResponse<{ link: EvaluationLink }>>(
      `/events/${eventId}/evaluation-links`,
      payload
    ),

  resend: (id: string) =>
    api.post<ApiResponse<null>>(`/evaluation-links/${id}/resend`),

  revoke: (id: string) =>
    api.delete<ApiResponse<null>>(`/evaluation-links/${id}`),

  getInsights: (eventId: string) =>
    api.get<ApiResponse<{ content: EvalInsightContent; generatedAt: string }>>(
      `/events/${eventId}/evaluation-links/insights`
    ),

  generateInsights: (eventId: string) =>
    api.post<ApiResponse<{ content: EvalInsightContent; generatedAt: string }>>(
      `/events/${eventId}/evaluation-links/insights/generate`
    ),
}

export interface EvalInsightContent {
  eventSummary: string
  cohortStrength: 'excellent' | 'good' | 'developing' | 'needs_support'
  cohortPattern: string
  rankings: { rank: number; teamId: string; teamName: string; headline: string }[]
  teamAnalyses: {
    teamId: string
    teamName: string
    verdict: string
    strengths: string[]
    improvements: string[]
    judgeConsensus: string
    divergence: string | null
    recommendation: string
    readinessLevel: 'investor_ready' | 'near_ready' | 'needs_work' | 'early_stage'
  }[]
  standoutInsights: { insight: string; significance: string }[]
  facilitatorActions: { action: string; urgency: 'immediate' | 'this_week' | 'this_month'; targetTeams: string[] }[]
}
