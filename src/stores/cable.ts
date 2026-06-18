import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, post, put, del, patch, postForm } from '@/composables/useApi'

export interface Device {
  name: string
  deviceType: string
}

export interface Cable {
  id: number
  model: string
  interfaceType: string
  length: string
  color: string
  purchaseDate: string
  expectedLifeDays: number
  status: string
  imageUrl?: string
  devices: Device[]
  createdAt: string
  updatedAt: string
}

export interface CableFilters {
  status?: string
  interfaceType?: string
  length?: string
  color?: string
  startDate?: string
  endDate?: string
}

interface CableListData {
  list: Cable[]
  total: number
}

interface OverviewData {
  total: number
  normal: number
  damaged: number
  lost: number
  expiringSoon: number
}

interface MonthlyItem {
  month: string
  added: number
  damaged: number
  lost: number
}

interface ExpiringItem {
  id: number
  model: string
  daysRemaining: number
}

export const useCableStore = defineStore('cable', () => {
  const cables = ref<Cable[]>([])
  const currentCable = ref<Cable | null>(null)
  const total = ref(0)
  const filters = ref<CableFilters>({})
  const pagination = ref({ page: 1, pageSize: 10 })

  async function fetchCables(overrideFilters?: CableFilters & { page?: number; pageSize?: number }) {
    const params: Record<string, string | number> = {
      page: overrideFilters?.page ?? pagination.value.page,
      pageSize: overrideFilters?.pageSize ?? pagination.value.pageSize,
    }
    const f = overrideFilters ?? filters.value
    if (f.status) params.status = f.status
    if (f.interfaceType) params.interfaceType = f.interfaceType
    if (f.length) params.length = f.length
    if (f.color) params.color = f.color
    if (f.startDate) params.startDate = f.startDate
    if (f.endDate) params.endDate = f.endDate

    const res = await get<CableListData>('/api/cables', params)
    if (res.success) {
      cables.value = res.data.list
      total.value = res.data.total
    }
    return res
  }

  async function fetchCable(id: number) {
    const res = await get<{ cable: Cable }>(`/api/cables/${id}`)
    if (res.success) {
      currentCable.value = res.data.cable
    }
    return res
  }

  async function createCable(data: Partial<Cable>) {
    const res = await post<Cable>('/api/cables', data)
    if (res.success) {
      await fetchCables()
    }
    return res
  }

  async function updateCable(id: number, data: Partial<Cable>) {
    const res = await put<Cable>(`/api/cables/${id}`, data)
    return res
  }

  async function deleteCable(id: number) {
    const res = await del(`/api/cables/${id}`)
    if (res.success) {
      await fetchCables()
    }
    return res
  }

  async function updateStatus(id: number, status: string) {
    const res = await patch<Cable>(`/api/cables/${id}/status`, { status })
    return res
  }

  async function uploadImage(id: number, file: File) {
    const res = await postForm<{ imageUrl: string }>(`/api/cables/${id}/image`, file)
    return res
  }

  async function fetchOverview() {
    const res = await get<OverviewData>('/api/stats/overview')
    return res
  }

  async function fetchMonthly(months = 6) {
    const res = await get<MonthlyItem[]>('/api/stats/monthly', { months })
    return res
  }

  async function fetchExpiring(days = 30) {
    const res = await get<ExpiringItem[]>('/api/stats/expiring', { days })
    return res
  }

  function setFilters(newFilters: CableFilters) {
    filters.value = { ...newFilters }
    pagination.value.page = 1
  }

  function setPagination(page: number, pageSize: number) {
    pagination.value.page = page
    pagination.value.pageSize = pageSize
  }

  return {
    cables,
    currentCable,
    total,
    filters,
    pagination,
    fetchCables,
    fetchCable,
    createCable,
    updateCable,
    deleteCable,
    updateStatus,
    uploadImage,
    fetchOverview,
    fetchMonthly,
    fetchExpiring,
    setFilters,
    setPagination,
  }
})
