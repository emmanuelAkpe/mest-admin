import api from './client'
import type { Event, ApiResponse, EventType, EventStatus } from '@/types'

export interface EventsQuery {
  page?: number
  limit?: number
  type?: EventType
  status?: EventStatus
}

export interface CreateEventPayload {
  name: string
  type: EventType
  description?: string
  startDate: string
  endDate: string
  parentEvent?: string
}

export const eventsApi = {
  listByCohort: (cohortId: string, params?: EventsQuery) =>
    api.get<ApiResponse<Event[]>>(`/cohorts/${cohortId}/events`, {
      params,
    }),

  get: (id: string) => api.get<ApiResponse<{ event: Event }>>(`/events/${id}`),

  create: (cohortId: string, payload: CreateEventPayload) =>
    api.post<ApiResponse<{ event: Event }>>(`/cohorts/${cohortId}/events`, payload),

  update: (id: string, payload: Partial<CreateEventPayload>) =>
    api.put<ApiResponse<{ event: Event }>>(`/events/${id}`, payload),

  listByParent: (parentEventId: string) =>
    api.get<ApiResponse<Event[]>>(`/events/${parentEventId}/sessions`),
}
