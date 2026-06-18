<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Edit, Trash2, Eye, RefreshCw } from 'lucide-vue-next'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Cable } from '@/stores/cable'
import { useCableStore } from '@/stores/cable'
import CableForm from '@/components/CableForm.vue'
import LifeProgress from '@/components/LifeProgress.vue'

const cableStore = useCableStore()
const router = useRouter()

const filters = ref({
  status: '',
  interfaceType: '',
  length: '',
  color: '',
  dateRange: null as [string, string] | null,
})

const formVisible = ref(false)
const editingCable = ref<Cable | null>(null)
const loading = ref(false)

const statusOptions = ['正常', '损坏', '丢失']
const interfaceOptions = ['USB-C', 'Lightning', 'Micro-USB', 'USB-A', '其他']
const lengthOptions = ['0.5m', '1m', '1.5m', '2m', '2m+', '其他']
const colorOptions = ['黑色', '白色', '红色', '蓝色', '绿色', '其他']

onMounted(() => {
  loadCables()
})

function getStatusTagType(status: string) {
  if (status === '正常') return 'success'
  if (status === '损坏') return 'danger'
  if (status === '丢失') return 'warning'
  return 'info'
}

async function loadCables() {
  loading.value = true
  try {
    const params: any = { ...filters.value }
    if (filters.value.dateRange && filters.value.dateRange.length === 2) {
      params.startDate = filters.value.dateRange[0]
      params.endDate = filters.value.dateRange[1]
    }
    delete params.dateRange
    await cableStore.fetchCables(params)
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.value = { status: '', interfaceType: '', length: '', color: '', dateRange: null }
  cableStore.setPagination(1, 10)
  loadCables()
}

function handleAdd() {
  editingCable.value = null
  formVisible.value = true
}

function handleEdit(cable: Cable) {
  editingCable.value = cable
  formVisible.value = true
}

function handleView(cable: Cable) {
  router.push(`/cables/${cable.id}`)
}

async function handleDelete(cable: Cable) {
  try {
    await ElMessageBox.confirm(`确认删除充电线「${cable.model}」？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const res = await cableStore.deleteCable(cable.id)
    if (res.success) {
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(res.error || '删除失败')
    }
  } catch {}
}

async function handleStatusChange(cable: Cable, status: string) {
  const res = await cableStore.updateStatus(cable.id, status)
  if (res.success) {
    ElMessage.success('状态已更新')
    loadCables()
  } else {
    ElMessage.error(res.error || '更新失败')
  }
}

async function handleFormSave(data: { formData: Partial<Cable>; imageFile: File | null }) {
  try {
    let res
    if (editingCable.value) {
      res = await cableStore.updateCable(editingCable.value.id, data.formData, data.imageFile)
    } else {
      res = await cableStore.createCable(data.formData, data.imageFile)
    }
    if (res.success) {
      ElMessage.success(editingCable.value ? '更新成功' : '创建成功')
      formVisible.value = false
      loadCables()
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch {
    ElMessage.error('网络错误')
  }
}

function handlePageChange(page: number) {
  cableStore.setPagination(page, cableStore.pagination.pageSize)
  loadCables()
}

function handleSizeChange(size: number) {
  cableStore.setPagination(1, size)
  loadCables()
}
</script>

<template>
  <div class="animate-fade-in-up">
    <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-4 mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="w-32">
          <label class="block text-text-muted text-xs font-heading mb-1 tracking-wider">状态</label>
          <el-select v-model="filters.status" placeholder="全部" clearable size="default" @change="loadCables">
            <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
          </el-select>
        </div>
        <div class="w-40">
          <label class="block text-text-muted text-xs font-heading mb-1 tracking-wider">接口类型</label>
          <el-select v-model="filters.interfaceType" placeholder="全部" clearable size="default" @change="loadCables">
            <el-option v-for="i in interfaceOptions" :key="i" :label="i" :value="i" />
          </el-select>
        </div>
        <div class="w-28">
          <label class="block text-text-muted text-xs font-heading mb-1 tracking-wider">长度</label>
          <el-select v-model="filters.length" placeholder="全部" clearable size="default" @change="loadCables">
            <el-option v-for="l in lengthOptions" :key="l" :label="l" :value="l" />
          </el-select>
        </div>
        <div class="w-28">
          <label class="block text-text-muted text-xs font-heading mb-1 tracking-wider">颜色</label>
          <el-select v-model="filters.color" placeholder="全部" clearable size="default" @change="loadCables">
            <el-option v-for="c in colorOptions" :key="c" :label="c" :value="c" />
          </el-select>
        </div>
        <div class="w-56">
          <label class="block text-text-muted text-xs font-heading mb-1 tracking-wider">购买日期</label>
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始"
            end-placeholder="结束"
            value-format="YYYY-MM-DD"
            size="default"
            @change="loadCables"
          />
        </div>
        <el-button @click="resetFilters" size="default">
          <RefreshCw class="w-3.5 h-3.5 mr-1" /> 重置
        </el-button>
        <div class="flex-1"></div>
        <el-button type="primary" size="default" @click="handleAdd">
          <Plus class="w-3.5 h-3.5 mr-1" /> 添加充电线
        </el-button>
      </div>
    </div>

    <div class="bg-space-deep/60 border border-electric/10 rounded-xl overflow-hidden">
      <el-table
        :data="cableStore.cables"
        v-loading="loading"
        style="width: 100%"
        :header-cell-style="{ background: 'rgba(15,188,249,0.06)' }"
      >
        <el-table-column prop="model" label="型号" min-width="180">
          <template #default="{ row }">
            <span class="font-heading text-white font-medium">{{ row.model }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="interfaceType" label="接口类型" width="110" />
        <el-table-column prop="length" label="长度" width="80" />
        <el-table-column prop="color" label="颜色" width="80" />
        <el-table-column prop="purchaseDate" label="购买日期" width="120">
          <template #default="{ row }">
            <span class="text-text-muted text-sm">{{ row.purchaseDate?.split('T')[0] || row.purchaseDate }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small" effect="dark">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="剩余寿命" min-width="160">
          <template #default="{ row }">
            <LifeProgress :purchase-date="row.purchaseDate" :expected-life-days="row.expectedLifeDays" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
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
                    <el-dropdown-item v-for="s in statusOptions" :key="s" :command="s">{{ s }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end p-4">
        <el-pagination
          v-model:current-page="cableStore.pagination.page"
          v-model:page-size="cableStore.pagination.pageSize"
          :total="cableStore.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
          background
          small
        />
      </div>
    </div>

    <CableForm
      :visible="formVisible"
      :cable="editingCable"
      @close="formVisible = false"
      @save="handleFormSave"
    />
  </div>
</template>
