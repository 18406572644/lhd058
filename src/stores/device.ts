import { defineStore } from 'pinia'
import { ref } from 'vue'
import { get, post, put, del, patch } from '@/composables/useApi'
import type { Cable } from './cable'

export interface Device {
  id: number
  name: string
  brand: string
  model: string
  deviceType: string
  purchaseDate?: string
  price: number
  status: string
  isSpecial: boolean
  note?: string
  cables?: Cable[]
  createdAt: string
  updatedAt: string
}

export interface DeviceFilters {
  status?: string
  deviceType?: string
  keyword?: string
}

interface DeviceListData {
  list: Device[]
  total: number
}

export const useDeviceStore = defineStore('device', () => {
  const devices = ref<Device[]>([])
  const allDevices = ref<Device[]>([])
  const currentDevice = ref<Device | null>(null)
  const total = ref(0)
  const filters = ref<DeviceFilters>({})
  const pagination = ref({ page: 1, pageSize: 10 })

  const deviceTypeOptions = [
    { value: '手机', label: '手机' },
    { value: '平板', label: '平板' },
    { value: '笔记本', label: '笔记本' },
    { value: '耳机', label: '耳机' },
    { value: '充电宝', label: '充电宝' },
    { value: '智能手表', label: '智能手表' },
    { value: '相机', label: '相机' },
    { value: '游戏机', label: '游戏机' },
    { value: '其他', label: '其他' },
  ]

  const statusOptions = ['在用', '闲置', '已淘汰']

  async function fetchDevices(overrideFilters?: DeviceFilters & { page?: number; pageSize?: number }) {
    const params: Record<string, string | number> = {
      page: overrideFilters?.page ?? pagination.value.page,
      pageSize: overrideFilters?.pageSize ?? pagination.value.pageSize,
    }
    const f = overrideFilters ?? filters.value
    if (f.status) params.status = f.status
    if (f.deviceType) params.deviceType = f.deviceType
    if (f.keyword) params.keyword = f.keyword

    const res = await get<DeviceListData>('/api/devices', params)
    if (res.success) {
      devices.value = res.data.list
      total.value = res.data.total
    }
    return res
  }

  async function fetchAllDevices() {
    const res = await get<Device[]>('/api/devices/all')
    if (res.success) {
      allDevices.value = res.data
    }
    return res
  }

  async function fetchDevice(id: number) {
    const res = await get<Device>(`/api/devices/${id}`)
    if (res.success) {
      currentDevice.value = res.data
    }
    return res
  }

  async function createDevice(data: Partial<Device> & { cableIds?: number[] }) {
    const res = await post<Device>('/api/devices', data)
    if (res.success) {
      pagination.value.page = 1
      await fetchDevices()
      await fetchAllDevices()
    }
    return res
  }

  async function updateDevice(id: number, data: Partial<Device> & { cableIds?: number[] }) {
    const res = await put<Device>(`/api/devices/${id}`, data)
    if (res.success) {
      if (currentDevice.value?.id === id) {
        currentDevice.value = res.data
      }
      const idx = devices.value.findIndex(d => d.id === id)
      if (idx !== -1) {
        devices.value[idx] = res.data
      }
      await fetchAllDevices()
    }
    return res
  }

  async function deleteDevice(id: number) {
    const res = await del(`/api/devices/${id}`)
    if (res.success) {
      await fetchDevices()
      await fetchAllDevices()
    }
    return res
  }

  async function updateStatus(id: number, status: string) {
    const res = await patch<Device>(`/api/devices/${id}/status`, { status })
    if (res.success) {
      if (currentDevice.value?.id === id) {
        currentDevice.value = { ...currentDevice.value, ...res.data }
      }
      const idx = devices.value.findIndex(d => d.id === id)
      if (idx !== -1) {
        devices.value[idx] = { ...devices.value[idx], ...res.data }
      }
    }
    return res
  }

  function setFilters(newFilters: DeviceFilters) {
    filters.value = { ...newFilters }
    pagination.value.page = 1
  }

  function setPagination(page: number, pageSize: number) {
    pagination.value.page = page
    pagination.value.pageSize = pageSize
  }

  return {
    devices,
    allDevices,
    currentDevice,
    total,
    filters,
    pagination,
    deviceTypeOptions,
    statusOptions,
    fetchDevices,
    fetchAllDevices,
    fetchDevice,
    createDevice,
    updateDevice,
    deleteDevice,
    updateStatus,
    setFilters,
    setPagination,
  }
})
