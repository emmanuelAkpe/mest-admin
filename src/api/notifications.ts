import api from './client'
import type { ApiResponse } from '@/types'

export type NotificationType =
  | 'submission_received'
  | 'evaluation_submitted'
  | 'mentor_review_added'
  | 'ai_review_ready'
  | 'deadline_approaching'
  | 'ai_programme_briefing'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  cohort: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export const notificationsApi = {
  list: (params?: { cohort?: string; unread?: boolean }) =>
    api.get<ApiResponse<{ notifications: Notification[]; unreadCount: number }>>(
      '/notifications',
      { params }
    ),

  markRead: (id: string) =>
    api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`),

  markAllRead: (cohort?: string) =>
    api.post<ApiResponse<Record<string, never>>>('/notifications/mark-all-read', { cohort }),
}
