<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Edit, Trash2, Eye, RefreshCw, Search, Smartphone, Tablet, Laptop, Headphones, Battery, Watch, Camera, Gamepad2, MoreHorizontal } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Device } from '@/stores/device'
import { useDeviceStore } from '@/stores/device'
import DeviceForm from '@/components/DeviceForm.vue'
import { markRaw } from 'vue'

const deviceStore = useDeviceStore()
const router = useRouter()

const SmartphoneIcon = markRaw(Smartphone)
const TabletIcon = markRaw(Tablet)
const LaptopIcon = markRaw(Laptop)
const HeadphonesIcon = markRaw(Headphones)
const BatteryIcon = markRaw(Battery)
const WatchIcon = markRaw(Watch)
const CameraIcon = markRaw(Camera)
const Gamepad2Icon = markRaw(Gamepad2)

const filters = ref({
  status: '',
  deviceType: '',
  keyword: '',
})

const formVisible = ref(false)
const editingDevice = ref<Device | null>(null)
const loading = ref(false)

const deviceTypeIcons: Record<string, any> = {
  '手机': SmartphoneIcon,
  '平板': TabletIcon,
  '笔记本': LaptopIcon,
  '耳机': HeadphonesIcon,
  '充电宝': BatteryIcon,
  '智能手表': WatchIcon,
  '相机': CameraIcon,
  '游戏机': Gamepad2Icon,
}

onMounted(() => {
  loadDevices()
})

function getStatusTagType(status: string) {
  if (status === '在用') return 'success'
  if (status === '闲置') return 'warning'
  if (status === '已淘汰') return 'info'
  return 'info'
}

function getDeviceTypeIcon(type: string) {
  return deviceTypeIcons[type] || SmartphoneIcon
}

async function loadDevices() {
  loading.value = true
  try {
    await deviceStore.fetchDevices(filters.value)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = { status: '', deviceType: '', keyword: '' }
  deviceStore.setPagination(1, 10)
  loadDevices()
}

function handleAdd() {
  editingDevice.value = null
  formVisible.value = true
}

function handleEdit(device: Device) {
  editingDevice.value = device
  formVisible.value = true
}

function handleView(device: Device) {
  ElMessage.info('设备详情页开发中')
}

async function handleDelete(device: Device) {
  try {
    await ElMessageBox.confirm(`确认删除设备「${device.name}」？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res = await deviceStore.deleteDevice(device.id)
    if (res.success) {
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch {}
}

async function handleStatusChange(device: Device, status: string) {
  const res = await deviceStore.updateStatus(device.id, status)
  if (res.success) {
    ElMessage.success('状态已更新')
    loadDevices()
  } else {
    ElMessage.error(res.error || '更新失败')
  }
}

async function handleFormSave(data: Partial<Device> & { cableIds?: number[] }) {
  try {
    let res
    if (editingDevice.value) {
      res = await deviceStore.updateDevice(editingDevice.value.id, data)
    } else {
      res = await deviceStore.createDevice(data)
    }
    if (res.success) {
      ElMessage.success(editingDevice.value ? '更新成功' : '创建成功')
      formVisible.value = false
      loadDevices()
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch {
    ElMessage.error('网络错误')
  }
}

function handlePageChange(page: number) {
  deviceStore.setPagination(page, deviceStore.pagination.pageSize)
  loadDevices()
}

function handleSizeChange(size: number) {
  deviceStore.setPagination(1, size)
  loadDevices()
}

function handleSearch() {
  deviceStore.setPagination(1, deviceStore.pagination.pageSize)
  loadDevices()
}
</script>

<template>
  <div class="animate-fade-in-up">
    <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-4 mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="w-56">
          <label class="block text-text-muted text-xs font-heading mb-1 tracking-wider">搜索</label>
          <el-input
            v-model="filters.keyword"
            placeholder="设备名称/品牌/型号"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          >
            <template #prefix>
              <Search class="w-4 h-4 text-text-muted" />
            </template>
          </el-input>
        </div>
        <div class="w-32">
          <label class="block text-text-muted text-xs font-heading mb-1 tracking-wider">状态</label>
          <el-select v-model="filters.status" placeholder="全部" clearable size="default" @change="handleSearch">
            <el-option v-for="s in deviceStore.statusOptions" :key="s" :label="s" :value="s" />
          </el-select>
        </div>
        <div class="w-36">
          <label class="block text-text-muted text-xs font-heading mb-1 tracking-wider">设备类型</label>
          <el-select v-model="filters.deviceType" placeholder="全部" clearable size="default" @change="handleSearch">
            <el-option
              v-for="opt in deviceStore.deviceTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>
        <el-button @click="resetFilters" size="default">
          <RefreshCw class="w-3.5 h-3.5 mr-1" /> 重置
        </el-button>
        <div class="flex-1"></div>
        <el-button type="primary" size="default" @click="handleAdd">
          <Plus class="w-3.5 h-3.5 mr-1" /> 添加设备
        </el-button>
      </div>
    </div>

    <div class="bg-space-deep/60 border border-electric/10 rounded-xl overflow-hidden">
      <el-table
        :data="deviceStore.devices"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: 'rgba(15,188,249,0.06)' }"
      >
        <el-table-column label="设备" min-width="220">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center flex-shrink-0">
                <component :is="getDeviceTypeIcon(row.deviceType)" class="w-5 h-5 text-electric" />
              </div>
              <div class="min-w-0">
                <div class="font-heading text-white font-medium truncate">{{ row.name }}</div>
                <div class="text-text-muted text-xs mt-0.5 flex items-center gap-2">
                  <span v-if="row.brand">{{ row.brand }}</span>
                  <span v-if="row.model">{{ row.model }}</span>
                  <span v-if="!row.brand && !row.model">{{ row.deviceType }}</span>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="deviceType" label="类型" width="100" />
        <el-table-column label="价格" width="100">
          <template #default="{ row }">
            <span v-if="row.price" class="text-electric">¥{{ row.price.toFixed(2) }}</span>
            <span v-else class="text-text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="购买日期" width="120">
          <template #default="{ row }">
            <span v-if="row.purchaseDate" class="text-text-muted text-sm">
              {{ row.purchaseDate?.split('T')[0] || row.purchaseDate }}
            </span>
            <span v-else class="text-text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small" effect="dark">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="专用" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isSpecial" type="warning" size="small" effect="dark">专用</el-tag>
            <span v-else class="text-text-muted text-xs">-</span>
          </template>
        </el-table-column>
        <el-table-column label="可用充电线" min-width="140">
          <template #default="{ row }">
            <div v-if="row.cables && row.cables.length > 0" class="flex flex-wrap gap-1">
              <el-tag
                v-for="cable in row.cables.slice(0, 3)"
                :key="cable.id"
                size="small"
                type="info"
                effect="plain"
                class="text-xs"
              >
                {{ cable.model }}
              </el-tag>
              <el-tag
                v-if="row.cables.length > 3"
                size="small"
                type="info"
                effect="plain"
                class="text-xs"
              >
                +{{ row.cables.length - 3 }}
              </el-tag>
            </div>
            <span v-else class="text-text-muted text-xs">暂无</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="flex items-center gap-1">
              <el-button size="small" @click="handleView(row)" text title="查看详情">
                <Eye class="w-3.5 h-3.5 text-electric" />
              </el-button>
              <el-button size="small" @click="handleEdit(row)" text title="编辑">
                <Edit class="w-3.5 h-3.5 text-electric" />
              </el-button>
              <el-button size="small" @click="handleDelete(row)" text type="danger" title="删除">
                <Trash2 class="w-3.5 h-3.5" />
              </el-button>
              <el-dropdown trigger="click" @command="(cmd: string) => handleStatusChange(row, cmd)">
                <el-button size="small" text>
                  <span class="text-xs font-heading text-electric">状态</span>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="s in deviceStore.statusOptions" :key="s" :command="s">{{ s }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end p-4">
        <el-pagination
          v-model:current-page="deviceStore.pagination.page"
          v-model:page-size="deviceStore.pagination.pageSize"
          :total="deviceStore.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
          background
          small
        />
      </div>
    </div>

    <DeviceForm
      :visible="formVisible"
      :device="editingDevice"
      @close="formVisible = false"
      @save="handleFormSave"
    />
  </div>
</template>
