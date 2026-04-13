import api from './client'
import type { Admin, ApiResponse } from '@/types'

export type { Admin }

interface LoginPayload {
  email: string
  password: string
}

interface TokenResponse {
  accessToken: string
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<ApiResponse<TokenResponse>>('/auth/login', payload),

  logout: () => api.post<ApiResponse<null>>('/auth/logout'),

  refresh: () => api.post<ApiResponse<TokenResponse>>('/auth/refresh'),

  me: () => api.get<ApiResponse<Admin>>('/auth/me'),

  onboard: (payload: { email: string; token: string; password: string }) =>
    api.post<ApiResponse<TokenResponse>>('/auth/onboard', payload),

  forgotPassword: (email: string) =>
    api.post<ApiResponse<null>>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post<ApiResponse<null>>('/auth/reset-password', { token, password }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<ApiResponse<null>>('/auth/change-password', {
      currentPassword,
      newPassword,
    }),

  invite: (payload: {
    firstName: string
    lastName: string
    email: string
    role?: string
  }) => api.post<ApiResponse<Admin>>('/auth/invite', payload),

  resendInvite: (adminId: string) =>
    api.post<ApiResponse<null>>('/auth/resend-invite', { adminId }),

  listAdmins: () =>
    api.get<ApiResponse<Admin[]>>('/auth/admins'),

  updateProfile: (payload: { firstName?: string; lastName?: string; photo?: string | null }) =>
    api.patch<ApiResponse<Admin>>('/auth/profile', payload),
}
