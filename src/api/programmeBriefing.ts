import api from './client'
import type { ApiResponse } from '@/types'

export type TeamHealthStatus = 'thriving' | 'on_track' | 'at_risk' | 'critical'

export interface UrgentAction {
  priority: 'high' | 'medium' | 'low'
  action: string
  reason: string
}

export interface TeamHealth {
  teamId: string | null
  teamName: string
  status: TeamHealthStatus
  score: number | null
  note: string
}

export interface CoachingPrompt {
  teamId: string | null
  teamName: string
  prompt: string
  focusArea: string
}

export interface ResourceRecommendation {
  topic: string
  rationale: string
  targetTeams: string[]
}

export interface BriefingHighlight {
  type: 'win' | 'concern' | 'milestone' | 'trend'
  text: string
}

export interface ProgrammeBriefing {
  id: string
  cohort: string
  generatedAt: string
  model: string
  healthScore: number
  summary: string
  urgentActions: UrgentAction[]
  teamHealth: TeamHealth[]
  coachingPrompts: CoachingPrompt[]
  resourceRecommendations: ResourceRecommendation[]
  highlights: BriefingHighlight[]
  createdAt: string
}

export const programmeBriefingApi = {
  generate: (cohortId: string) =>
    api.post<ApiResponse<ProgrammeBriefing>>(`/cohorts/${cohortId}/briefings`),

  list: (cohortId: string) =>
    api.get<ApiResponse<ProgrammeBriefing[]>>(`/cohorts/${cohortId}/briefings`),

  getById: (cohortId: string, id: string) =>
    api.get<ApiResponse<ProgrammeBriefing>>(`/cohorts/${cohortId}/briefings/${id}`),
}
