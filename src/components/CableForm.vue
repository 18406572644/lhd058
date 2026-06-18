<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { Upload } from 'lucide-vue-next'
import type { FormInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import type { Cable } from '@/stores/cable'
import { useDeviceStore } from '@/stores/device'

const props = defineProps<{
  visible: boolean
  cable: Cable | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: { formData: Partial<Cable> & { deviceIds?: number[] }; imageFile: File | null }): void
}>()

const deviceStore = useDeviceStore()

const formRef = ref<FormInstance>()

const form = ref({
  model: '',
  brand: '',
  interfaceType: '',
  length: '',
  color: '',
  price: 0,
  purchaseDate: '',
  expectedLifeDays: 730,
  status: '正常',
})

const selectedDeviceIds = ref<number[]>([])
const devicesLoading = ref(false)
const imageFile = ref<File | null>(null)
const imagePreview = ref('')

const isEdit = computed(() => !!props.cable)

const interfaceOptions = ['USB-C', 'Lightning', 'Micro-USB', 'USB-A', '其他']
const lengthOptions = ['0.5m', '1m', '1.5m', '2m', '2m+', '其他']
const colorOptions = ['黑色', '白色', '红色', '蓝色', '绿色', '其他']
const statusOptions = ['正常', '损坏', '丢失']

const rules = {
  model: [{ required: true, message: '请输入充电线型号', trigger: 'blur' }],
  interfaceType: [{ required: true, message: '请选择接口类型', trigger: 'change' }],
}

onMounted(async () => {
  await loadDevices()
})

async function loadDevices() {
  if (deviceStore.allDevices.length === 0) {
    devicesLoading.value = true
    try {
      await deviceStore.fetchAllDevices()
    } catch {
      ElMessage.error('加载设备列表失败')
    } finally {
      devicesLoading.value = false
    }
  }
}

watch(() => props.visible, async (val) => {
  if (val && props.cable) {
    form.value = {
      model: props.cable.model,
      brand: props.cable.brand || '',
      interfaceType: props.cable.interfaceType,
      length: props.cable.length,
      color: props.cable.color,
      price: props.cable.price || 0,
      purchaseDate: props.cable.purchaseDate?.split('T')[0] || props.cable.purchaseDate || '',
      expectedLifeDays: props.cable.expectedLifeDays,
      status: props.cable.status,
    }
    selectedDeviceIds.value = props.cable.devices?.map(d => d.id).filter(id => id !== undefined) as number[] || []
    imagePreview.value = props.cable.imageUrl || ''
    await loadDevices()
  } else if (val) {
    form.value = { model: '', brand: '', interfaceType: '', length: '', color: '', price: 0, purchaseDate: '', expectedLifeDays: 730, status: '正常' }
    selectedDeviceIds.value = []
    imagePreview.value = ''
    imageFile.value = null
    await loadDevices()
  }
})

function handleImageChange(uploadFile: any) {
  const file = uploadFile.raw || uploadFile
  if (file instanceof File) {
    imageFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    const formData: Partial<Cable> & { deviceIds: number[] } = {
      ...form.value,
      deviceIds: selectedDeviceIds.value,
    }
    emit('save', { formData, imageFile: imageFile.value })
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
    :title="isEdit ? '编辑充电线' : '添加充电线'"
    width="560px"
    destroy-on-close
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" label-position="top">
      <el-form-item label="型号" prop="model">
        <el-input v-model="form.model" placeholder="例如：USB-C to USB-C 100W 快充线" />
      </el-form-item>

      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="品牌">
          <el-input v-model="form.brand" placeholder="例如：Anker、绿联" />
        </el-form-item>

        <el-form-item label="价格（元）">
          <el-input-number v-model="form.price" :min="0" :precision="2" :step="1" class="w-full" />
        </el-form-item>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="接口类型" prop="interfaceType">
          <el-select v-model="form.interfaceType" placeholder="请选择" class="w-full">
            <el-option v-for="opt in interfaceOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>

        <el-form-item label="长度规格">
          <el-select v-model="form.length" placeholder="请选择" class="w-full">
            <el-option v-for="opt in lengthOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="外观颜色">
          <el-select v-model="form.color" placeholder="请选择" class="w-full">
            <el-option v-for="opt in colorOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>

        <el-form-item label="使用状态">
          <el-select v-model="form.status" class="w-full">
            <el-option v-for="opt in statusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <el-form-item label="购买日期">
          <el-date-picker v-model="form.purchaseDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" class="w-full" />
        </el-form-item>

        <el-form-item label="预期寿命（天）">
          <el-input-number v-model="form.expectedLifeDays" :min="1" :max="3650" class="w-full" />
        </el-form-item>
      </div>

      <el-form-item label="适配设备">
        <el-select
          v-model="selectedDeviceIds"
          multiple
          filterable
          placeholder="从设备库选择可充电的设备"
          class="w-full"
          :loading="devicesLoading"
        >
          <el-option
            v-for="device in deviceStore.allDevices"
            :key="device.id"
            :label="`${device.name} (${device.deviceType})`"
            :value="device.id"
          />
        </el-select>
        <div class="text-xs text-text-muted mt-1">一条充电线可充多个设备，一个设备可用多条线</div>
      </el-form-item>

      <el-form-item label="实拍图片">
        <div class="w-full">
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="handleImageChange"
          >
            <div v-if="imagePreview" class="relative group">
              <img :src="imagePreview" class="w-32 h-32 object-cover rounded-lg border border-electric/20" />
              <div class="absolute inset-0 bg-space-dark/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Upload class="w-5 h-5 text-electric" />
              </div>
            </div>
            <div v-else class="w-32 h-32 border-2 border-dashed border-electric/20 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-electric/40 transition-colors">
              <Upload class="w-6 h-6 text-text-muted mb-1" />
              <span class="text-xs text-text-muted font-heading">点击上传</span>
            </div>
          </el-upload>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" @click="handleSubmit" class="font-heading tracking-wider">{{ isEdit ? '保存修改' : '确认添加' }}</el-button>
    </template>
  </el-dialog>
</template>
