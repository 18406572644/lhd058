<script setup lang="ts">
import { useRouter } from 'vue-router'
import { AlertTriangle, ChevronRight } from 'lucide-vue-next'

interface ExpiringCable {
  id: number
  model: string
  daysRemaining?: number
}

const props = defineProps<{
  cables: ExpiringCable[]
}>()

const router = useRouter()

function goToDetail(id: number) {
  router.push(`/cables/${id}`)
}

function getBadgeColor(days: number): string {
  if (days <= 7) return 'var(--danger)'
  if (days <= 14) return 'var(--warning)'
  return 'var(--accent)'
}
</script>

<template>
  <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-5 h-full">
    <h3 class="font-heading text-base font-semibold text-white mb-4 tracking-wider">到期提醒</h3>
    <div v-if="cables.length === 0" class="text-text-muted text-sm py-10 text-center flex flex-col items-center gap-2">
      <AlertTriangle class="w-10 h-10 text-electric/20" />
      <span>暂无即将到期的充电线</span>
    </div>
    <div v-else class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
      <div
        v-for="cable in cables"
        :key="cable.id"
        @click="goToDetail(cable.id)"
        class="flex items-center justify-between px-3 py-3 rounded-lg bg-space-dark/50 border border-electric/5 hover:border-electric/25 hover:bg-space-dark/70 cursor-pointer transition-all duration-200 group"
      >
        <div class="flex items-center gap-3 min-w-0">
          <AlertTriangle class="w-4 h-4 flex-shrink-0" :style="{ color: getBadgeColor(cable.daysRemaining ?? 0) }" />
          <span class="text-sm text-white font-heading truncate">{{ cable.model }}</span>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            class="text-xs font-heading font-semibold px-2.5 py-0.5 rounded-md"
            :style="{
              color: getBadgeColor(cable.daysRemaining ?? 0),
              backgroundColor: getBadgeColor(cable.daysRemaining ?? 0) + '18'
            }"
          >
            剩余 {{ cable.daysRemaining }} 天
          </span>
          <ChevronRight class="w-4 h-4 text-text-muted group-hover:text-electric transition-colors" />
        </div>
      </div>
    </div>
  </div>
</template>
