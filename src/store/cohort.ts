import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CohortState {
  activeCohortId: string | null
  setActiveCohort: (id: string) => void
  clearActiveCohort: () => void
}

export const useCohortStore = create<CohortState>()(
  persist(
    (set) => ({
      activeCohortId: null,
      setActiveCohort: (id) => set({ activeCohortId: id }),
      clearActiveCohort: () => set({ activeCohortId: null }),
    }),
    {
      name: 'mest-cohort',
      partialize: (state) => ({ activeCohortId: state.activeCohortId }),
    }
  )
)
