import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { OnboardPage } from '@/pages/auth/OnboardPage'
import { CohortSelectionPage } from '@/pages/cohorts/CohortSelectionPage'
import { CohortsPage } from '@/pages/cohorts/CohortsPage'
import { DashboardPage } from '@/pages/cohorts/DashboardPage'
import { TraineesPage } from '@/pages/trainees/TraineesPage'
import { TraineeProfilePage } from '@/pages/trainees/TraineeProfilePage'
import { EventsPage } from '@/pages/events/EventsPage'
import { EventDetailPage } from '@/pages/events/EventDetailPage'
import { TeamsPage } from '@/pages/teams/TeamsPage'
import { TeamProfilePage } from '@/pages/teams/TeamProfilePage'
import { SubmitPage } from '@/pages/submissions/SubmitPage'
import { EvaluatePage } from '@/pages/evaluate/EvaluatePage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return !isAuthenticated ? <>{children}</> : <Navigate to="/select-cohort" replace />
}

export default function App() {
  return (
    <Routes>
      <Route
        element={
          <RequireGuest>
            <AuthLayout />
          </RequireGuest>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/onboard" element={<OnboardPage />} />
      </Route>

      <Route
        path="/select-cohort"
        element={
          <RequireAuth>
            <CohortSelectionPage />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/select-cohort" replace />} />
        <Route path="/cohorts" element={<CohortsPage />} />
        <Route path="/cohorts/:id" element={<DashboardPage />} />
        <Route path="/cohorts/:id/analytics" element={<AnalyticsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/trainees" element={<TraineesPage />} />
        <Route path="/trainees/:id" element={<TraineeProfilePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:id" element={<TeamProfilePage />} />
      </Route>

      {/* Public — no auth required */}
      <Route path="/submit/:token" element={<SubmitPage />} />
      <Route path="/evaluate/:token" element={<EvaluatePage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
