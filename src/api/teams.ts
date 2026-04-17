import api from './client'
import type { Team, ApiResponse, TeamMemberRole, PivotType, TeamFeedback, TeamFeedbackType, MemberChange, MentorSession } from '@/types'

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
    api.get<ApiResponse<Team[]>>(`/events/${eventId}/teams`),

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

  sendProfileLink: (id: string) =>
    api.post(`/teams/${id}/profile-link`),

  revokeProfileLink: (id: string) =>
    api.delete(`/teams/${id}/profile-link`),

  // Mentor assignment
  assignMentor: (id: string, mentorId: string | null) =>
    api.patch<ApiResponse<{ id: string; mentor: Team['mentor'] }>>(`/teams/${id}/mentor`, { mentorId }),

  sendPortalInvite: (id: string) =>
    api.post<ApiResponse<{ sentTo: number }>>(`/teams/${id}/portal-invite`),

  // Mentor sessions
  listMentorSessions: (teamId: string) =>
    api.get<ApiResponse<MentorSession[]>>(`/teams/${teamId}/mentor-sessions`),

  createMentorSession: (teamId: string, payload: { sessionDate: string; notes?: string; actionItems?: string[] }) =>
    api.post<ApiResponse<MentorSession>>(`/teams/${teamId}/mentor-sessions`, payload),

  updateMentorSession: (sessionId: string, payload: { sessionDate?: string; notes?: string; actionItems?: string[] }) =>
    api.patch<ApiResponse<MentorSession>>(`/mentor-sessions/${sessionId}`, payload),

  deleteMentorSession: (sessionId: string) =>
    api.delete<ApiResponse<void>>(`/mentor-sessions/${sessionId}`),
}
