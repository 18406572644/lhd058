import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, post, put, del, patch, postForm } from '@/composables/useApi'

export interface Device {
  id?: number
  name: string
  deviceType: string
  brand?: string
  model?: string
  status?: string
  isSpecial?: boolean
}

export interface Cable {
  id: number
  model: string
  brand: string
  interfaceType: string
  length: string
  color: string
  price: number
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

export interface BrandLifeItem {
  brand: string
  count: number
  avgLifeDays: number
}

export interface InterfaceDamageItem {
  interfaceType: string
  total: number
  damaged: number
  damageRate: number
}

export interface YearlyCostItem {
  year: string
  count: number
  totalAmount: number
}

export interface DailyCostItem {
  id: number
  model: string
  brand: string
  price: number
  dailyCost: number
  expectedLifeDays: number
  daysUsed: number
  totalCostToDate: number
  status: string
}

export interface ColorStatItem {
  color: string
  count: number
}

export interface LengthStatItem {
  length: string
  count: number
}

export interface SummaryData {
  totalInvestment: number
  avgPrice: number
  mostCommonColor: string
  mostCommonInterface: string
  avgLifeDays: number
  totalCables: number
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
    const res = await get<Cable>(`/api/cables/${id}`)
    if (res.success) {
      currentCable.value = res.data
    }
    return res
  }

  async function createCable(data: Partial<Cable>, imageFile?: File | null) {
    const res = await post<Cable>('/api/cables', data)
    if (res.success) {
      const newCable = res.data
      if (imageFile) {
        try {
          const imgRes = await postForm<{ imageUrl: string }>(`/api/cables/${newCable.id}/image`, imageFile)
          if (imgRes.success) {
            newCable.imageUrl = imgRes.data.imageUrl
          }
        } catch {
          // 图片上传失败不影响创建成功
        }
      }
      pagination.value.page = 1
      await fetchCables()
    }
    return res
  }

  async function updateCable(id: number, data: Partial<Cable>, imageFile?: File | null) {
    const res = await put<Cable>(`/api/cables/${id}`, data)
    if (res.success) {
      let updatedCable = res.data
      if (imageFile) {
        try {
          const imgRes = await postForm<{ imageUrl: string }>(`/api/cables/${id}/image`, imageFile)
          if (imgRes.success) {
            updatedCable = { ...updatedCable, imageUrl: imgRes.data.imageUrl }
          }
        } catch {
          // 图片上传失败不影响更新成功
        }
      }
      if (currentCable.value?.id === id) {
        currentCable.value = updatedCable
      }
      const idx = cables.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        cables.value[idx] = updatedCable
      }
    }
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
    if (res.success) {
      if (currentCable.value?.id === id) {
        currentCable.value = { ...currentCable.value, ...res.data }
      }
      const idx = cables.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        cables.value[idx] = { ...cables.value[idx], ...res.data }
      }
    }
    return res
  }

  async function uploadImage(id: number, file: File) {
    const res = await postForm<{ imageUrl: string }>(`/api/cables/${id}/image`, file)
    if (res.success) {
      if (currentCable.value?.id === id) {
        currentCable.value = { ...currentCable.value, imageUrl: res.data.imageUrl }
      }
      const idx = cables.value.findIndex(c => c.id === id)
      if (idx !== -1) {
        cables.value[idx] = { ...cables.value[idx], imageUrl: res.data.imageUrl }
      }
    }
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

  async function fetchBrandLife() {
    const res = await get<BrandLifeItem[]>('/api/stats/brand-life')
    return res
  }

  async function fetchInterfaceDamageRate() {
    const res = await get<InterfaceDamageItem[]>('/api/stats/interface-damage-rate')
    return res
  }

  async function fetchYearlyCost() {
    const res = await get<YearlyCostItem[]>('/api/stats/yearly-cost')
    return res
  }

  async function fetchDailyCost() {
    const res = await get<DailyCostItem[]>('/api/stats/daily-cost')
    return res
  }

  async function fetchColorStats() {
    const res = await get<ColorStatItem[]>('/api/stats/color-stats')
    return res
  }

  async function fetchLengthStats() {
    const res = await get<LengthStatItem[]>('/api/stats/length-stats')
    return res
  }

  async function fetchSummary() {
    const res = await get<SummaryData>('/api/stats/summary')
    return res
  }

  function getExportUrl() {
    return '/api/stats/export'
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
    fetchBrandLife,
    fetchInterfaceDamageRate,
    fetchYearlyCost,
    fetchDailyCost,
    fetchColorStats,
    fetchLengthStats,
    fetchSummary,
    getExportUrl,
    setFilters,
    setPagination,
  }
})
