import api from './client'
import type { Kpi, ApiResponse, ScaleType, KpiAppliesTo, KpiRubricItem } from '@/types'

export interface CreateKpiPayload {
  name: string
  description?: string
  weight: number
  scaleType: ScaleType
  scaleMin?: number
  scaleMax?: number
  appliesTo?: KpiAppliesTo
  requireComment?: boolean
  showRecommendation?: boolean
  order?: number
  rubric?: KpiRubricItem[]
}

export const kpisApi = {
  listByEvent: (eventId: string) =>
    api.get<ApiResponse<{ kpis: Kpi[] }>>(`/events/${eventId}/kpis`),

  create: (eventId: string, payload: CreateKpiPayload) =>
    api.post<ApiResponse<{ kpi: Kpi }>>(`/events/${eventId}/kpis`, payload),

  update: (id: string, payload: Partial<CreateKpiPayload>) =>
    api.put<ApiResponse<{ kpi: Kpi }>>(`/kpis/${id}`, payload),

  delete: (id: string) => api.delete<ApiResponse<null>>(`/kpis/${id}`),
}
