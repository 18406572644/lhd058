<script setup lang="ts">
import { ref, onMounted, computed, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Cable as CableIcon, ChevronLeft, Edit, Upload, Tag, Calendar, Timer, Check } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useCableStore, type Cable } from '@/stores/cable'
import CableForm from '@/components/CableForm.vue'

const route = useRoute()
const router = useRouter()
const cableStore = useCableStore()

const loading = ref(false)
const formVisible = ref(false)

const PlaceholderIcon = markRaw(CableIcon)

const cable = computed(() => cableStore.currentCable)

const lifePercentage = computed(() => {
  if (!cable.value) return 0
  const purchase = new Date(cable.value.purchaseDate)
  const now = new Date()
  const totalMs = cable.value.expectedLifeDays * 24 * 60 * 60 * 1000
  const remainingMs = totalMs - (now.getTime() - purchase.getTime())
  return Math.max(0, Math.min(100, Math.round((remainingMs / totalMs) * 100)))
})

const remainingDays = computed(() => {
  if (!cable.value) return 0
  const purchase = new Date(cable.value.purchaseDate)
  const now = new Date()
  const totalMs = cable.value.expectedLifeDays * 24 * 60 * 60 * 1000
  const elapsedMs = now.getTime() - purchase.getTime()
  const remainingMs = totalMs - elapsedMs
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
})

const progressColor = computed(() => {
  const p = lifePercentage.value
  if (p > 60) return 'var(--success)'
  if (p > 30) return 'var(--warning)'
  return 'var(--danger)'
})

onMounted(async () => {
  const id = Number(route.params.id)
  loading.value = true
  try {
    await cableStore.fetchCable(id)
  } catch {
    ElMessage.error('加载失败')
    router.push('/cables')
  } finally {
    loading.value = false
  }
})

function goBack() {
  router.push('/cables')
}

function handleEdit() {
  formVisible.value = true
}

async function handleStatusChange(status: string) {
  if (!cable.value) return
  const res = await cableStore.updateStatus(cable.value.id, status)
  if (res.success) {
    ElMessage.success('状态已更新')
    await cableStore.fetchCable(cable.value.id)
  } else {
    ElMessage.error(res.error || '更新失败')
  }
}

async function handleFormSave(data: { formData: Partial<Cable>; imageFile: File | null }) {
  if (!cable.value) return
  const res = await cableStore.updateCable(cable.value.id, data.formData, data.imageFile)
  if (res.success) {
    ElMessage.success('更新成功')
    formVisible.value = false
    await cableStore.fetchCable(cable.value.id)
  } else {
    ElMessage.error(res.error || '更新失败')
  }
}

async function handleImageUpload(uploadFile: any) {
  if (!cable.value) return
  const file = uploadFile.raw || uploadFile
  if (!(file instanceof File)) return
  const res = await cableStore.uploadImage(cable.value.id, file)
  if (res.success) {
    ElMessage.success('图片上传成功')
    await cableStore.fetchCable(cable.value.id)
  } else {
    ElMessage.error(res.error || '上传失败')
  }
}

function getStatusTagType(status: string) {
  if (status === '正常') return 'success'
  if (status === '损坏') return 'danger'
  if (status === '丢失') return 'warning'
  return 'info'
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '-'
  return dateStr.split('T')[0] || dateStr
}
</script>

<template>
  <div class="animate-fade-in-up" v-if="cable">
    <button
      @click="goBack"
      class="flex items-center gap-1 text-text-muted hover:text-electric transition-colors mb-6 font-heading text-sm tracking-wider"
    >
      <ChevronLeft class="w-4 h-4" /> 返回充电线列表
    </button>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-6 flex flex-col items-center">
        <div class="w-52 h-52 rounded-xl border border-electric/10 flex items-center justify-center mb-4 overflow-hidden bg-space-dark/50">
          <img v-if="cable.imageUrl" :src="cable.imageUrl" class="w-full h-full object-cover" />
          <component :is="PlaceholderIcon" v-else class="w-20 h-20 text-electric/20" />
        </div>
        <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" :on-change="handleImageUpload">
          <el-button size="small">
            <Upload class="w-3.5 h-3.5 mr-1" /> 上传实拍图
          </el-button>
        </el-upload>

        <div class="w-full mt-8 text-center">
          <p class="text-text-muted text-xs font-heading uppercase mb-3 tracking-wider">剩余寿命预估</p>
          <el-progress
            type="circle"
            :percentage="lifePercentage"
            :width="120"
            :color="progressColor"
            :stroke-width="10"
          >
            <template #default>
              <div class="flex flex-col items-center">
                <span class="font-heading text-2xl font-bold" :style="{ color: progressColor }">
                  {{ lifePercentage }}%
                </span>
                <span class="font-heading text-xs text-text-muted mt-1">剩 {{ remainingDays }} 天</span>
              </div>
            </template>
          </el-progress>
        </div>
      </div>

      <div class="lg:col-span-2 space-y-6">
        <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="font-heading text-2xl font-bold text-white tracking-wide">{{ cable.model }}</h2>
              <p class="text-text-muted text-sm mt-1 font-heading">充电线详细信息</p>
            </div>
            <div class="flex items-center gap-3">
              <el-tag :type="getStatusTagType(cable.status)" effect="dark" size="large">{{ cable.status }}</el-tag>
              <el-button size="default" @click="handleEdit">
                <Edit class="w-4 h-4 mr-1" /> 编辑
              </el-button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-8 gap-y-4">
            <div class="flex items-center gap-3 py-3 border-b border-electric/5">
              <Tag class="w-5 h-5 text-electric/70" />
              <div>
                <p class="text-text-muted text-xs font-heading uppercase tracking-wider mb-0.5">接口类型</p>
                <p class="text-white font-heading text-base">{{ cable.interfaceType }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 py-3 border-b border-electric/5">
              <Tag class="w-5 h-5 text-electric/70" />
              <div>
                <p class="text-text-muted text-xs font-heading uppercase tracking-wider mb-0.5">长度规格</p>
                <p class="text-white font-heading text-base">{{ cable.length }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 py-3 border-b border-electric/5">
              <Tag class="w-5 h-5 text-electric/70" />
              <div>
                <p class="text-text-muted text-xs font-heading uppercase tracking-wider mb-0.5">外观颜色</p>
                <p class="text-white font-heading text-base">{{ cable.color }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 py-3 border-b border-electric/5">
              <Calendar class="w-5 h-5 text-electric/70" />
              <div>
                <p class="text-text-muted text-xs font-heading uppercase tracking-wider mb-0.5">购买日期</p>
                <p class="text-white font-heading text-base">{{ formatDate(cable.purchaseDate) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 py-3 border-b border-electric/5">
              <Timer class="w-5 h-5 text-electric/70" />
              <div>
                <p class="text-text-muted text-xs font-heading uppercase tracking-wider mb-0.5">预期寿命</p>
                <p class="text-white font-heading text-base">{{ cable.expectedLifeDays }} 天</p>
              </div>
            </div>
            <div class="flex items-center gap-3 py-3 border-b border-electric/5">
              <Check class="w-5 h-5 text-electric/70" />
              <div>
                <p class="text-text-muted text-xs font-heading uppercase tracking-wider mb-0.5">录入时间</p>
                <p class="text-white font-heading text-base">{{ formatDate(cable.createdAt) }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-6">
          <h3 class="font-heading text-base font-semibold text-white mb-4 tracking-wider">适配设备列表</h3>
          <div v-if="cable.devices && cable.devices.length" class="flex flex-wrap gap-3">
            <el-tag
              v-for="(device, idx) in cable.devices"
              :key="idx"
              effect="dark"
              type="info"
              class="border-electric/20 px-4 py-1.5"
              size="large"
            >
              <span class="font-heading">{{ device.name }}</span>
              <span v-if="device.deviceType" class="text-text-muted ml-2 text-xs">({{ device.deviceType }})</span>
            </el-tag>
          </div>
          <p v-else class="text-text-muted text-sm">暂无适配设备</p>
        </div>

        <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-6">
          <h3 class="font-heading text-base font-semibold text-white mb-4 tracking-wider">变更状态</h3>
          <div class="flex gap-3">
            <el-button
              v-for="s in ['正常', '损坏', '丢失']"
              :key="s"
              :type="cable.status === s ? 'primary' : 'default'"
              size="default"
              @click="handleStatusChange(s)"
              class="font-heading tracking-wider"
            >
              {{ s }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <CableForm
      :visible="formVisible"
      :cable="cable"
      @close="formVisible = false"
      @save="handleFormSave"
    />
  </div>

  <div v-else class="flex items-center justify-center h-64 text-text-muted">
    加载中...
  </div>
</template>
