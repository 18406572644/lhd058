<script setup lang="ts">
import { ref, onMounted, markRaw } from 'vue'
import { Cable, AlertTriangle, Check, Timer } from 'lucide-vue-next'
import StatsCard from '@/components/StatsCard.vue'
import MonthlyChart from '@/components/MonthlyChart.vue'
import ExpiringList from '@/components/ExpiringList.vue'
import { useCableStore } from '@/stores/cable'

const cableStore = useCableStore()

const overview = ref({ total: 0, normal: 0, damaged: 0, lost: 0, expiringSoon: 0 })
const monthlyData = ref<Array<{ month: string; added: number; damaged: number; lost: number }>>([])
const expiringCables = ref<Array<{ id: number; model: string; daysRemaining: number }>>([])

onMounted(async () => {
  const [overviewRes, monthlyRes, expiringRes] = await Promise.all([
    cableStore.fetchOverview(),
    cableStore.fetchMonthly(6),
    cableStore.fetchExpiring(30),
  ])
  if (overviewRes.success) overview.value = overviewRes.data
  if (monthlyRes.success) monthlyData.value = monthlyRes.data
  if (expiringRes.success && expiringRes.data) expiringCables.value = expiringRes.data
})
</script>

<template>
  <div class="space-y-6 animate-fade-in-up">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard title="充电线总数" :value="overview.total" :icon="markRaw(Cable)" />
      <StatsCard title="正常使用" :value="overview.normal" :icon="markRaw(Check)" color="var(--success)" />
      <StatsCard title="已损坏" :value="overview.damaged" :icon="markRaw(AlertTriangle)" color="var(--danger)" />
      <StatsCard title="即将到期" :value="overview.expiringSoon" :icon="markRaw(Timer)" color="var(--warning)" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <MonthlyChart :data="monthlyData" />
      </div>
      <div>
        <ExpiringList :cables="expiringCables" />
      </div>
    </div>
  </div>
</template>
