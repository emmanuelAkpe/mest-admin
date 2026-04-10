import api from './client'
import type { Deliverable, DeliverableAiReview, SubmissionFileType, ApiResponse } from '@/types'

export interface CreateDeliverablePayload {
  title: string
  description?: string
  acceptedTypes: SubmissionFileType[]
  deadline: string
}

export interface UpdateDeliverablePayload {
  title?: string
  description?: string
  acceptedTypes?: SubmissionFileType[]
  deadline?: string
}

export const deliverablesApi = {
  listByEvent: (eventId: string) =>
    api.get<ApiResponse<Deliverable[]>>(`/events/${eventId}/deliverables`),

  create: (eventId: string, payload: CreateDeliverablePayload) =>
    api.post<ApiResponse<{ deliverable: Deliverable; linksCreated: number }>>(`/events/${eventId}/deliverables`, payload),

  update: (id: string, payload: UpdateDeliverablePayload) =>
    api.put<ApiResponse<Deliverable>>(`/deliverables/${id}`, payload),

  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/deliverables/${id}`),

  generateReview: (id: string) =>
    api.post<ApiResponse<DeliverableAiReview>>(`/deliverables/${id}/review`),

  sendReminders: (id: string) =>
    api.post<ApiResponse<{ sent: number }>>(`/deliverables/${id}/send-reminders`),
}
