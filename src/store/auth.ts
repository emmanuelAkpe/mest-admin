import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Admin } from '@/types'

interface AuthState {
  admin: Admin | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (admin: Admin, accessToken: string) => void
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (admin, accessToken) =>
        set({ admin, accessToken, isAuthenticated: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () =>
        set({ admin: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'mest-auth',
      partialize: (state) => ({
        admin: state.admin,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
