import api from './client'
import type { Team, ApiResponse, TeamMemberRole, PivotType, TeamFeedback, TeamFeedbackType, MemberChange } from '@/types'

export interface CreateTeamPayload {
  name: string
  productIdea?: string
  marketFocus?: string
  members?: { trainee: string; roles: TeamMemberRole[] }[]
}

export interface LogPivotPayload {
  type: PivotType
  description: string
  reason?: string
  wasProactive?: boolean
}

export const teamsApi = {
  listByEvent: (eventId: string) =>
    api.get<ApiResponse<{ teams: Team[] }>>(`/events/${eventId}/teams`),

  get: (id: string) => api.get<ApiResponse<{ team: Team }>>(`/teams/${id}`),

  create: (eventId: string, payload: CreateTeamPayload) =>
    api.post<ApiResponse<{ team: Team }>>(`/events/${eventId}/teams`, payload),

  update: (id: string, payload: Partial<CreateTeamPayload>) =>
    api.put<ApiResponse<{ team: Team }>>(`/teams/${id}`, payload),

  dissolve: (id: string) =>
    api.post<ApiResponse<{ team: Team }>>(`/teams/${id}/dissolve`),

  logPivot: (id: string, payload: LogPivotPayload) =>
    api.post<ApiResponse<{ team: Team }>>(`/teams/${id}/pivots`, payload),

  // Feedback
  listFeedback: (teamId: string) =>
    api.get<ApiResponse<TeamFeedback[]>>(`/teams/${teamId}/feedback`),
  addFeedback: (teamId: string, payload: { content: string; type: TeamFeedbackType }) =>
    api.post<ApiResponse<TeamFeedback>>(`/teams/${teamId}/feedback`, payload),
  deleteFeedback: (teamId: string, feedbackId: string) =>
    api.delete<ApiResponse<void>>(`/teams/${teamId}/feedback/${feedbackId}`),

  // Member change log
  listMemberChanges: (teamId: string) =>
    api.get<ApiResponse<MemberChange[]>>(`/teams/${teamId}/member-changes`),
  logMemberChange: (teamId: string, payload: { trainee: string; changeType: 'joined' | 'left' | 'role_changed'; previousRoles?: TeamMemberRole[]; newRoles?: TeamMemberRole[]; reason?: string; destinationTeam?: string }) =>
    api.post<ApiResponse<MemberChange>>(`/teams/${teamId}/member-changes`, payload),
}
