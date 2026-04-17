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
    api.get<ApiResponse<EvaluationLink[]>>(
      `/events/${eventId}/evaluation-links`
    ),

  results: (eventId: string) =>
    api.get<ApiResponse<unknown>>(`/events/${eventId}/evaluation-links/results`),

  create: (eventId: string, payload: CreateEvaluationLinkPayload) =>
    api.post<ApiResponse<{ link: EvaluationLink }>>(
      `/events/${eventId}/evaluation-links`,
      payload
    ),

  getLink: (id: string) =>
    api.get<ApiResponse<EvaluationLinkDetail>>(`/evaluation-links/${id}`),

  summarize: (id: string) =>
    api.post<ApiResponse<{ summary: EvalSubmissionSummary; cached: boolean }>>(
      `/evaluation-links/${id}/summarize`
    ),

  generateTeamLetters: (eventId: string) =>
    api.post<ApiResponse<{ letters: { teamId: string; teamName: string; letter: string }[] }>>(
      `/events/${eventId}/evaluation-links/generate-team-letters`
    ),

  sendTeamFeedback: (eventId: string, letters: { teamId: string; letter: string }[]) =>
    api.post<ApiResponse<{ teams: { teamId: string; teamName: string; recipientCount: number }[] }>>(
      `/events/${eventId}/evaluation-links/send-team-feedback`,
      { letters }
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

export interface EvalKpiScore {
  kpi: { id: string; name: string; weight: number; scaleType: string }
  score: number
  comment: string | null
  recommendation: string | null
}

export interface EvalTeamScore {
  team: { id: string; name: string }
  overallComment: string
  scores: EvalKpiScore[]
}

export interface EvalSubmission {
  id: string
  submittedAt: string
  evaluatorName: string
  evaluatorEmail: string | null
  teamScores: EvalTeamScore[]
  aiSummary: EvalSubmissionSummary | null
}

export interface EvalSubmissionSummary {
  overallTake: string
  scoringStyle: 'strict' | 'balanced' | 'generous'
  keyThemes: string[]
  teamHighlights: { teamName: string; observation: string }[]
  standoutComment: string
}

export interface EvaluationLinkDetail {
  id: string
  evalUrl: string | null
  evaluatorName: string
  evaluatorEmail: string | null
  status: string
  expiresAt: string
  isRevoked: boolean
  teams: { _id: string; name: string }[]
  submission: EvalSubmission | null
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
