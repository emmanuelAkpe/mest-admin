export type AdminRole = 'super_admin' | 'program_admin'

export interface Admin {
  id: string
  firstName: string
  lastName: string
  email: string
  role: AdminRole
  lastLogin: string | null
  createdAt: string
}

export type CohortStatus = 'upcoming' | 'active' | 'completed' | 'archived'

export interface Cohort {
  id: string
  name: string
  year: number
  description: string | null
  status: CohortStatus
  startDate: string
  endDate: string
  createdBy: string | Admin
  createdAt: string
  updatedAt: string
}

export type TechnicalLevel = 'none' | 'basic' | 'intermediate' | 'advanced'
export type AiSkillLevel = 'none' | 'basic' | 'intermediate' | 'advanced'

export interface Trainee {
  id: string
  cohort: string | Cohort
  firstName: string
  lastName: string
  email: string
  country: string
  photo: string | null
  bio: string | null
  technicalBackground: TechnicalLevel
  aiSkillLevel: AiSkillLevel
  linkedIn: string | null
  github: string | null
  portfolio: string | null
  entryScore: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type EventType =
  | 'startup_build'
  | 'newco'
  | 'class_workshop'
  | 'internal_review'
  | 'demo_pitch_day'
  | 'other'

export type EventStatus = 'not_started' | 'in_progress' | 'completed'

export interface Event {
  id: string
  cohort: string | Cohort
  parentEvent: string | Event | null
  name: string
  type: EventType
  description: string | null
  startDate: string
  endDate: string
  status: EventStatus
  createdBy: string | Admin
  createdAt: string
  updatedAt: string
}

export type TeamMemberRole =
  | 'team_lead'
  | 'cto'
  | 'product'
  | 'business'
  | 'design'
  | 'marketing'
  | 'finance'
  | 'data_ai'
  | 'presenter'

export type PivotType =
  | 'product_idea'
  | 'target_market'
  | 'business_model'
  | 'technical_approach'
  | 'multiple'

export type TeamStatus = 'not_started' | 'active' | 'completed' | 'dissolved'

export interface TeamMember {
  trainee: string | Trainee
  roles: TeamMemberRole[]
}

export interface TeamPivot {
  id: string
  type: PivotType
  description: string
  reason: string | null
  wasProactive: boolean | null
  loggedBy: string | Admin
  createdAt: string
}

export interface Team {
  id: string
  cohort: string | Cohort
  event: string | Event
  parentTeam: string | Team | null
  name: string
  productIdea: string | null
  marketFocus: string | null
  members: TeamMember[]
  pivots: TeamPivot[]
  isDissolved: boolean
  status: TeamStatus
  createdBy: string | Admin
  createdAt: string
  updatedAt: string
}

export type ScaleType = '1_to_5' | '1_to_10' | 'percentage' | 'custom'
export type KpiAppliesTo = 'team' | 'individual' | 'both'

export interface KpiRubricItem {
  score: number
  label: string
  description?: string
}

export interface Kpi {
  id: string
  event: string | Event
  name: string
  description: string | null
  weight: number
  weightNormalized: number
  scaleType: ScaleType
  scaleMin: number | null
  scaleMax: number | null
  appliesTo: KpiAppliesTo
  requireComment: boolean
  showRecommendation: boolean
  order: number
  rubric: KpiRubricItem[]
  createdBy: string | Admin
  createdAt: string
  updatedAt: string
}

export interface DashboardTopTeam {
  id: string
  name: string
  productIdea: string | null
  avgNormalizedScore: number
  healthScore: number
  memberCount: number
  eventName: string
}

export interface DashboardActivity {
  type: string
  text: string
  teamCount: number
  timestamp: string
}

export interface DashboardStats {
  activeTeamCount: number
  totalTeamCount: number
  traineeCount: number
  avgNormalizedScore: number | null
  topTeams: DashboardTopTeam[]
  recentActivity: DashboardActivity[]
}

export interface EventPerformance {
  eventId: string
  eventName: string
  eventType: string
  date: string
  submissionCount: number
  teamCount: number
  avgNormalizedScore: number | null
  teamScores: { teamId: string; teamName: string; avgNormalizedScore: number }[]
}

export interface KpiSummaryItem {
  kpiId: string
  kpiName: string
  avgNormalizedScore: number
  dataPoints: number
}

export interface TeamTrajectory {
  teamName: string
  points: { eventName: string; date: string; score: number }[]
}

export interface CohortAnalytics {
  eventPerformance: EventPerformance[]
  kpiSummary: KpiSummaryItem[]
  teamTrajectories: TeamTrajectory[]
}

export type EvaluationLinkStatus = 'not_opened' | 'opened' | 'submitted'

export interface EvaluationLink {
  id: string
  event: string | Event
  evaluatorName: string
  evaluatorEmail: string | null
  teams: (string | Team)[]
  status: EvaluationLinkStatus
  expiresAt: string
  isRevoked: boolean
  evalUrl: string | null
  createdBy: string | Admin
  createdAt: string
  updatedAt: string
}

export type SubmissionFileType =
  | 'video'
  | 'pdf'
  | 'image'
  | 'slides'
  | 'spreadsheet'
  | 'document'
  | 'link'
  | 'demo'

export type SubmissionLinkStatus = 'pending' | 'submitted' | 'late' | 'not_submitted'

export interface SubmissionItem {
  id: string
  fileType: SubmissionFileType
  url: string
  filename: string | null
  label: string | null
  submittedByEmail: string
  submittedAt: string
}

export interface SubmissionLink {
  id: string
  token: string
  event: string | Event
  team: string | Team
  title: string
  description: string | null
  acceptedTypes: SubmissionFileType[]
  deadline: string
  status: SubmissionLinkStatus
  submissions: SubmissionItem[]
  createdBy: string | Admin
  createdAt: string
  updatedAt: string
}

export type TeamFeedbackType = 'praise' | 'concern' | 'performance' | 'general'

export interface TeamFeedback {
  id: string
  team: string | Team
  content: string
  type: TeamFeedbackType
  createdBy: string | Admin
  createdAt: string
  updatedAt: string
}

export type MemberChangeType = 'joined' | 'left' | 'role_changed'

export interface MemberChange {
  id: string
  team: string | Team
  trainee: string | Trainee
  changeType: MemberChangeType
  previousRoles: TeamMemberRole[]
  newRoles: TeamMemberRole[]
  reason: string | null
  destinationTeam: string | Team | null
  loggedBy: string | Admin
  createdAt: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  pages: number
}

export interface ApiResponse<T> {
  success: true
  data: T
  message: string
  meta?: Record<string, unknown>
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: { field: string; message: string }[]
  }
}
