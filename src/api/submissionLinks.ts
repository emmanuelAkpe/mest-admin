import api from './client'
import publicApi from './publicClient'
import type { SubmissionLink, SubmissionFileType, SubmissionItem, ApiResponse } from '@/types'

export interface CreateSubmissionLinkPayload {
  teamId: string
  eventId: string
  title: string
  description?: string
  acceptedTypes: SubmissionFileType[]
  deadline: string
}

export const submissionLinksApi = {
  // ── Admin (authenticated) ─────────────────────────────────────────────────
  listByTeam: (teamId: string) =>
    api.get<ApiResponse<SubmissionLink[]>>(`/teams/${teamId}/submission-links`),

  create: (payload: CreateSubmissionLinkPayload) =>
    api.post<ApiResponse<SubmissionLink>>('/submission-links', payload),

  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/submission-links/${id}`),

  // ── Public (no auth) ─────────────────────────────────────────────────────
  getPublic: (token: string) =>
    publicApi.get<ApiResponse<SubmissionLink>>(`/submission-links/public/${token}`),

  requestAccess: (token: string, email: string) =>
    publicApi.post<ApiResponse<{ message: string }>>(`/submission-links/public/${token}/request-access`, { email }),

  verifyAccess: (token: string, email: string, otp: string) =>
    publicApi.post<ApiResponse<{ accessToken: string; submitterName: string }>>(`/submission-links/public/${token}/verify-access`, { email, otp }),

  submit: (token: string, accessToken: string, formData: FormData) =>
    publicApi.post<ApiResponse<SubmissionItem>>(`/submission-links/public/${token}/submissions`, formData, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'multipart/form-data' },
    }),

  submitLink: (token: string, accessToken: string, payload: { fileType: 'link' | 'demo'; url: string; label?: string }) =>
    publicApi.post<ApiResponse<SubmissionItem>>(`/submission-links/public/${token}/submissions`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),

  deleteSubmission: (token: string, accessToken: string, submissionId: string) =>
    publicApi.delete<ApiResponse<void>>(`/submission-links/public/${token}/submissions/${submissionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
}
