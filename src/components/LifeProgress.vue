<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  purchaseDate: string
  expectedLifeDays: number
}>()

const lifeInfo = computed(() => {
  const purchase = new Date(props.purchaseDate)
  const now = new Date()
  const totalMs = props.expectedLifeDays * 24 * 60 * 60 * 1000
  const elapsedMs = now.getTime() - purchase.getTime()
  const remainingMs = totalMs - elapsedMs
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
  const percentage = Math.max(0, Math.min(100, Math.round((remainingMs / totalMs) * 100)))
  return { remainingDays, percentage }
})

const progressColor = computed(() => {
  const p = lifeInfo.value.percentage
  if (p > 60) return 'var(--success)'
  if (p > 30) return 'var(--warning)'
  return 'var(--danger)'
})
</script>

<template>
  <div class="flex items-center gap-3">
    <el-progress
      :percentage="lifeInfo.percentage"
      :stroke-width="8"
      :color="progressColor"
      :show-text="false"
      class="flex-1"
    />
    <span class="text-xs font-heading whitespace-nowrap" :style="{ color: progressColor }">
      {{ lifeInfo.remainingDays }}d
    </span>
  </div>
</template>
