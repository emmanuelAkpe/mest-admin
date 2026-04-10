import publicApi from './publicClient'
import type { ApiResponse } from '@/types'
import type { PortalEvalScores } from '@/types'

export interface TraineePortalMember {
  firstName: string | undefined
  lastName: string | undefined
  photo: string | null
  roles: string[]
}

export interface TraineePortalTeam {
  id: string
  name: string
  productIdea: string | null
  marketFocus: string | null
  event: { name: string; type: string; startDate: string; endDate: string } | string
  members: TraineePortalMember[]
}

export interface TraineePortalTrainee {
  id: string
  firstName: string
  lastName: string
  email: string
  country: string
  photo: string | null
  bio: string | null
  education: string | null
  top3Skills: string | null
  coreTechSkills: string | null
  industriesOfInterest: string | null
  technicalBackground: string
  aiSkillLevel: string
  linkedIn: string | null
  github: string | null
  portfolio: string | null
  funFact: string | null
}

export interface TraineeMentorReview {
  id: string
  content: string
  rating: number | null
  mentor: { firstName: string; lastName: string } | string
  createdAt: string
}

export interface TraineeFacilitatorLog {
  id: string
  note: string
  facilitator: { firstName: string; lastName: string } | string
  createdAt: string
}

export interface TraineePortalData {
  trainee: TraineePortalTrainee
  team: TraineePortalTeam | null
  submissionLinks: import('@/types').PortalLink[]
  mentorReviews: TraineeMentorReview[]
  facilitatorLogs: TraineeFacilitatorLog[]
  evaluationScores: PortalEvalScores | null
  insight: import('@/types').TraineeInsightContent | null
}

export const traineePortalApi = {
  requestOtp: (email: string) =>
    publicApi.post<ApiResponse<Record<string, never>>>('/trainee-portal/request-otp', { email }),

  verifyOtp: (email: string, otp: string) =>
    publicApi.post<ApiResponse<{ accessToken: string; email: string }>>('/trainee-portal/verify-otp', { email, otp }),

  getMe: (accessToken: string) =>
    publicApi.get<ApiResponse<TraineePortalData>>('/trainee-portal/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
}
