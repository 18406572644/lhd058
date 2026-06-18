<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { X, Plus } from 'lucide-vue-next'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { Device } from '@/stores/device'
import { useDeviceStore } from '@/stores/device'
import { useCableStore } from '@/stores/cable'

const props = defineProps<{
  visible: boolean
  device: Device | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: Partial<Device> & { cableIds?: number[] }): void
}>()

const deviceStore = useDeviceStore()
const cableStore = useCableStore()

const formRef = ref<FormInstance>()

const form = ref({
  name: '',
  brand: '',
  model: '',
  deviceType: '',
  purchaseDate: '',
  price: 0,
  status: '在用',
  isSpecial: false,
  note: '',
})

const selectedCableIds = ref<number[]>([])
const cablesLoading = ref(false)

const isEdit = computed(() => !!props.device)

const rules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  deviceType: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
}

onMounted(async () => {
  await loadCables()
})

async function loadCables() {
  if (cableStore.cables.length === 0) {
    cablesLoading.value = true
    try {
      await cableStore.fetchCables({ pageSize: 100 })
    } catch {
      ElMessage.error('加载充电线列表失败')
    } finally {
      cablesLoading.value = false
    }
  }
}

watch(() => props.visible, async (val) => {
  if (val && props.device) {
    form.value = {
      name: props.device.name,
      brand: props.device.brand || '',
      model: props.device.model || '',
      deviceType: props.device.deviceType,
      purchaseDate: props.device.purchaseDate?.split('T')[0] || props.device.purchaseDate || '',
      price: props.device.price || 0,
      status: props.device.status,
      isSpecial: props.device.isSpecial || false,
      note: props.device.note || '',
    }
    selectedCableIds.value = props.device.cables?.map(c => c.id) || []
    await loadCables()
  } else if (val) {
    form.value = {
      name: '',
      brand: '',
      model: '',
      deviceType: '',
      purchaseDate: '',
      price: 0,
      status: '在用',
      isSpecial: false,
      note: '',
    }
    selectedCableIds.value = []
    await loadCables()
  }
})

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    const formData: Partial<Device> & { cableIds: number[] } = {
      ...form.value,
      cableIds: selectedCableIds.value,
    }
    emit('save', formData)
  })
}

function handleClose() {
  formRef.value?.resetFields()
  emit('close')
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    @close="handleClose"
    :title="isEdit ? '编辑设备' : '添加设备'"
    width="560px"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" label-position="top">
      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：iPhone 15 Pro" />
        </el-form-item>

        <el-form-item label="设备类型" prop="deviceType">
          <el-select v-model="form.deviceType" placeholder="请选择" class="w-full">
            <el-option
              v-for="opt in deviceStore.deviceTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="品牌">
          <el-input v-model="form.brand" placeholder="例如：Apple、华为" />
        </el-form-item>

        <el-form-item label="型号">
          <el-input v-model="form.model" placeholder="例如：A2848" />
        </el-form-item>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="购买日期">
          <el-date-picker
            v-model="form.purchaseDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="购买价格（元）">
          <el-input-number v-model="form.price" :min="0" :precision="2" :step="100" class="w-full" />
        </el-form-item>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="设备状态">
          <el-select v-model="form.status" class="w-full">
            <el-option v-for="s in deviceStore.statusOptions" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>

        <el-form-item label="专用充电线">
          <div class="flex items-center h-9">
            <el-switch v-model="form.isSpecial" />
            <span class="ml-2 text-text-muted text-sm">标记为专用充电线设备</span>
          </div>
        </el-form-item>
      </div>

      <el-form-item label="关联充电线">
        <el-select
          v-model="selectedCableIds"
          multiple
          filterable
          placeholder="选择可使用的充电线"
          class="w-full"
          :loading="cablesLoading"
        >
          <el-option
            v-for="cable in cableStore.cables"
            :key="cable.id"
            :label="`${cable.model} (${cable.interfaceType})`"
            :value="cable.id"
          />
        </el-select>
        <div class="text-xs text-text-muted mt-1">一条充电线可充多个设备，一个设备可用多条线</div>
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="form.note" type="textarea" :rows="2" placeholder="可选，补充说明" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" class="font-heading tracking-wider">
        {{ isEdit ? '保存修改' : '确认添加' }}
      </el-button>
    </template>
  </el-dialog>
</template>
