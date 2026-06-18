<script setup lang="ts">
import { ref, onMounted, computed, markRaw } from 'vue'
import {
  Cable, AlertTriangle, Check, Timer, Download, DollarSign,
  Clock, TrendingUp, Palette, Ruler, Zap, Shield
} from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import StatsCard from '@/components/StatsCard.vue'
import MonthlyChart from '@/components/MonthlyChart.vue'
import ExpiringList from '@/components/ExpiringList.vue'
import { useCableStore } from '@/stores/cable'
import type {
  BrandLifeItem, InterfaceDamageItem, YearlyCostItem,
  DailyCostItem, ColorStatItem, LengthStatItem, SummaryData
} from '@/stores/cable'

use([
  CanvasRenderer, BarChart, PieChart, LineChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent
])

const cableStore = useCableStore()

const overview = ref({ total: 0, normal: 0, damaged: 0, lost: 0, expiringSoon: 0 })
const monthlyData = ref<Array<{ month: string; added: number; damaged: number; lost: number }>>([])
const expiringCables = ref<Array<{ id: number; model: string; daysRemaining: number }>>([])

const brandLifeData = ref<BrandLifeItem[]>([])
const interfaceDamageData = ref<InterfaceDamageItem[]>([])
const yearlyCostData = ref<YearlyCostItem[]>([])
const dailyCostData = ref<DailyCostItem[]>([])
const colorStatsData = ref<ColorStatItem[]>([])
const lengthStatsData = ref<LengthStatItem[]>([])
const summaryData = ref<SummaryData | null>(null)

const loading = ref(false)

const brandLifeOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(22, 33, 62, 0.95)',
    borderColor: 'rgba(15, 188, 249, 0.2)',
    textStyle: { color: '#fff', fontFamily: 'Rajdhani, sans-serif' },
    formatter: (params: any) => {
      const item = params[0]
      return `${item.name}<br/>平均寿命: ${item.value} 天<br/>数量: ${brandLifeData.value[item.dataIndex]?.count || 0} 条`
    }
  },
  grid: {
    left: '3%', right: '4%', bottom: '3%', top: '3%',
    containLabel: true,
  },
  xAxis: {
    type: 'value',
    axisLine: { show: false },
    splitLine: { lineStyle: { color: 'rgba(15, 188, 249, 0.06)' } },
    axisLabel: { color: '#8892b0', fontFamily: 'Rajdhani, sans-serif' },
  },
  yAxis: {
    type: 'category',
    data: brandLifeData.value.map(d => d.brand || '未知'),
    axisLine: { lineStyle: { color: 'rgba(15, 188, 249, 0.15)' } },
    axisLabel: { color: '#8892b0', fontFamily: 'Rajdhani, sans-serif' },
  },
  series: [{
    type: 'bar',
    data: brandLifeData.value.map(d => d.avgLifeDays),
    itemStyle: {
      color: '#0fbcf9',
      borderRadius: [0, 4, 4, 0],
    },
    barMaxWidth: 20,
  }],
}))

const interfaceDamageOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(22, 33, 62, 0.95)',
    borderColor: 'rgba(15, 188, 249, 0.2)',
    textStyle: { color: '#fff', fontFamily: 'Rajdhani, sans-serif' },
    formatter: '{b}: {c}% ({d}%)',
  },
  legend: {
    orient: 'vertical',
    right: '5%',
    top: 'center',
    textStyle: { color: '#8892b0', fontFamily: 'Rajdhani, sans-serif', fontSize: 11 },
  },
  series: [{
    type: 'pie',
    radius: ['40%', '65%'],
    center: ['35%', '50%'],
    avoidLabelOverlap: false,
    itemStyle: {
      borderRadius: 4,
      borderColor: 'rgba(15, 23, 42, 0.8)',
      borderWidth: 2,
    },
    label: { show: false },
    data: interfaceDamageData.value.map((d, i) => ({
      value: d.damageRate,
      name: d.interfaceType,
      itemStyle: {
        color: ['#0fbcf9', '#5a6987', '#3a4260', '#4ecca3', '#f97316'][i % 5],
      },
    })),
  }],
}))

const yearlyCostOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(22, 33, 62, 0.95)',
    borderColor: 'rgba(15, 188, 249, 0.2)',
    textStyle: { color: '#fff', fontFamily: 'Rajdhani, sans-serif' },
    formatter: (params: any) => {
      const item = params[0]
      const data = yearlyCostData.value[item.dataIndex]
      return `${item.name}年<br/>购买数量: ${data?.count || 0} 条<br/>总金额: ¥${data?.totalAmount || 0}`
    }
  },
  grid: {
    left: '3%', right: '4%', bottom: '3%', top: '10%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: yearlyCostData.value.map(d => d.year).reverse(),
    axisLine: { lineStyle: { color: 'rgba(15, 188, 249, 0.15)' } },
    axisLabel: { color: '#8892b0', fontFamily: 'Rajdhani, sans-serif' },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    splitLine: { lineStyle: { color: 'rgba(15, 188, 249, 0.06)' } },
    axisLabel: {
      color: '#8892b0',
      fontFamily: 'Rajdhani, sans-serif',
      formatter: (v: number) => `¥${v}`,
    },
  },
  series: [{
    type: 'bar',
    data: yearlyCostData.value.map(d => d.totalAmount).reverse(),
    itemStyle: {
      color: '#4ecca3',
      borderRadius: [4, 4, 0, 0],
    },
    barMaxWidth: 30,
  }],
}))

const colorPieOption = computed(() => {
  const colorMap: Record<string, string> = {
    '黑色': '#2d3748',
    '白色': '#e2e8f0',
    '红色': '#ef4444',
    '蓝色': '#3b82f6',
    '绿色': '#22c55e',
    '其他': '#6b7280',
  }
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(22, 33, 62, 0.95)',
      borderColor: 'rgba(15, 188, 249, 0.2)',
      textStyle: { color: '#fff', fontFamily: 'Rajdhani, sans-serif' },
      formatter: '{b}: {c} 条 ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '3%',
      top: 'center',
      textStyle: { color: '#8892b0', fontFamily: 'Rajdhani, sans-serif', fontSize: 11 },
    },
    series: [{
      type: 'pie',
      radius: ['35%', '60%'],
      center: ['35%', '50%'],
      itemStyle: {
        borderRadius: 4,
        borderColor: 'rgba(15, 23, 42, 0.8)',
        borderWidth: 2,
      },
      label: { show: false },
      data: colorStatsData.value.map(d => ({
        value: d.count,
        name: d.color,
        itemStyle: { color: colorMap[d.color] || '#6b7280' },
      })),
    }],
  }
})

const lengthBarOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(22, 33, 62, 0.95)',
    borderColor: 'rgba(15, 188, 249, 0.2)',
    textStyle: { color: '#fff', fontFamily: 'Rajdhani, sans-serif' },
    formatter: '{b}<br/>数量: {c} 条',
  },
  grid: {
    left: '3%', right: '4%', bottom: '3%', top: '5%',
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: lengthStatsData.value.map(d => d.length),
    axisLine: { lineStyle: { color: 'rgba(15, 188, 249, 0.15)' } },
    axisLabel: { color: '#8892b0', fontFamily: 'Rajdhani, sans-serif' },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    splitLine: { lineStyle: { color: 'rgba(15, 188, 249, 0.06)' } },
    axisLabel: { color: '#8892b0', fontFamily: 'Rajdhani, sans-serif' },
  },
  series: [{
    type: 'bar',
    data: lengthStatsData.value.map(d => d.count),
    itemStyle: {
      color: '#f97316',
      borderRadius: [4, 4, 0, 0],
    },
    barMaxWidth: 30,
  }],
}))

const topDailyCost = computed(() => dailyCostData.value.slice(0, 5))

onMounted(async () => {
  loading.value = true
  try {
    const results = await Promise.all([
      cableStore.fetchOverview(),
      cableStore.fetchMonthly(6),
      cableStore.fetchExpiring(30),
      cableStore.fetchBrandLife(),
      cableStore.fetchInterfaceDamageRate(),
      cableStore.fetchYearlyCost(),
      cableStore.fetchDailyCost(),
      cableStore.fetchColorStats(),
      cableStore.fetchLengthStats(),
      cableStore.fetchSummary(),
    ])

    if (results[0].success) overview.value = results[0].data
    if (results[1].success) monthlyData.value = results[1].data
    if (results[2].success && results[2].data) expiringCables.value = results[2].data
    if (results[3].success) brandLifeData.value = results[3].data || []
    if (results[4].success) interfaceDamageData.value = results[4].data || []
    if (results[5].success) yearlyCostData.value = results[5].data || []
    if (results[6].success) dailyCostData.value = results[6].data || []
    if (results[7].success) colorStatsData.value = results[7].data || []
    if (results[8].success) lengthStatsData.value = results[8].data || []
    if (results[9].success) summaryData.value = results[9].data
  } finally {
    loading.value = false
  }
})

async function handleExport() {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/stats/export', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cables-export-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

function formatCost(value: number) {
  return value.toFixed(4)
}

function getStatusTagType(status: string) {
  if (status === '正常') return 'success'
  if (status === '损坏') return 'danger'
  if (status === '丢失') return 'warning'
  return 'info'
}
</script>

<template>
  <div class="space-y-6 animate-fade-in-up" v-loading="loading">
    <div class="flex items-center justify-between">
      <h2 class="font-heading text-xl font-bold text-white tracking-wider">数据仪表盘</h2>
      <el-button type="primary" @click="handleExport">
        <Download class="w-4 h-4 mr-2" /> 导出数据
      </el-button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard title="充电线总数" :value="overview.total" :icon="markRaw(Cable)" />
      <StatsCard title="正常使用" :value="overview.normal" :icon="markRaw(Check)" color="var(--success)" />
      <StatsCard title="已损坏" :value="overview.damaged" :icon="markRaw(AlertTriangle)" color="var(--danger)" />
      <StatsCard title="即将到期" :value="overview.expiringSoon" :icon="markRaw(Timer)" color="var(--warning)" />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="总投入金额"
        :value="`¥${summaryData?.totalInvestment?.toFixed(2) || '0.00'}`"
        :icon="markRaw(DollarSign)"
        color="#4ecca3"
      />
      <StatsCard
        title="平均单价"
        :value="`¥${summaryData?.avgPrice?.toFixed(2) || '0.00'}`"
        :icon="markRaw(TrendingUp)"
        color="#0fbcf9"
      />
      <StatsCard
        title="平均寿命(天)"
        :value="summaryData?.avgLifeDays || 0"
        :icon="markRaw(Clock)"
        color="#f97316"
      />
      <StatsCard
        title="最爱颜色"
        :value="summaryData?.mostCommonColor || '-'"
        :icon="markRaw(Palette)"
        color="#a855f7"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <MonthlyChart :data="monthlyData" />
      </div>
      <div>
        <ExpiringList :cables="expiringCables" />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-5">
        <div class="flex items-center gap-2 mb-4">
          <Shield class="w-5 h-5 text-electric" />
          <h3 class="font-heading text-base font-semibold text-white tracking-wider">品牌平均寿命</h3>
        </div>
        <VChart v-if="brandLifeData.length > 0" :option="brandLifeOption" style="height: 280px; width: 100%" autoresize />
        <div v-else class="h-[280px] flex items-center justify-center text-text-muted text-sm">
          暂无数据，请先添加品牌信息
        </div>
      </div>

      <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-5">
        <div class="flex items-center gap-2 mb-4">
          <Zap class="w-5 h-5 text-electric" />
          <h3 class="font-heading text-base font-semibold text-white tracking-wider">接口类型损坏率</h3>
        </div>
        <VChart v-if="interfaceDamageData.length > 0" :option="interfaceDamageOption" style="height: 280px; width: 100%" autoresize />
        <div v-else class="h-[280px] flex items-center justify-center text-text-muted text-sm">
          暂无数据
        </div>
      </div>
    </div>

    <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-5">
      <div class="flex items-center gap-2 mb-4">
        <DollarSign class="w-5 h-5 text-electric" />
        <h3 class="font-heading text-base font-semibold text-white tracking-wider">年度购买金额汇总</h3>
      </div>
      <VChart v-if="yearlyCostData.length > 0" :option="yearlyCostOption" style="height: 300px; width: 100%" autoresize />
      <div v-else class="h-[300px] flex items-center justify-center text-text-muted text-sm">
        暂无数据，请先设置充电线价格
      </div>
    </div>

    <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-5">
      <div class="flex items-center gap-2 mb-4">
        <Timer class="w-5 h-5 text-electric" />
        <h3 class="font-heading text-base font-semibold text-white tracking-wider">日均使用成本排行榜</h3>
      </div>
      <div v-if="topDailyCost.length > 0" class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr style="background: rgba(15,188,249,0.06)">
              <th class="text-left text-text-muted text-xs font-heading tracking-wider px-4 py-3">排名</th>
              <th class="text-left text-text-muted text-xs font-heading tracking-wider px-4 py-3">型号</th>
              <th class="text-left text-text-muted text-xs font-heading tracking-wider px-4 py-3">品牌</th>
              <th class="text-right text-text-muted text-xs font-heading tracking-wider px-4 py-3">购买价格</th>
              <th class="text-right text-text-muted text-xs font-heading tracking-wider px-4 py-3">日均成本</th>
              <th class="text-right text-text-muted text-xs font-heading tracking-wider px-4 py-3">已用天数</th>
              <th class="text-right text-text-muted text-xs font-heading tracking-wider px-4 py-3">累计成本</th>
              <th class="text-center text-text-muted text-xs font-heading tracking-wider px-4 py-3">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in topDailyCost" :key="item.id" class="border-t border-electric/5 hover:bg-electric/5 transition-colors">
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                  :class="{
                    'bg-yellow-500/20 text-yellow-400': index === 0,
                    'bg-gray-400/20 text-gray-400': index === 1,
                    'bg-orange-500/20 text-orange-400': index === 2,
                    'bg-electric/10 text-text-muted': index > 2,
                  }"
                >
                  {{ index + 1 }}
                </span>
              </td>
              <td class="px-4 py-3 text-white text-sm">{{ item.model }}</td>
              <td class="px-4 py-3 text-text-muted text-sm">{{ item.brand || '-' }}</td>
              <td class="px-4 py-3 text-text-muted text-sm text-right">¥{{ item.price.toFixed(2) }}</td>
              <td class="px-4 py-3 text-electric text-sm font-medium text-right">¥{{ formatCost(item.dailyCost) }}</td>
              <td class="px-4 py-3 text-text-muted text-sm text-right">{{ item.daysUsed }} 天</td>
              <td class="px-4 py-3 text-text-muted text-sm text-right">¥{{ item.totalCostToDate.toFixed(2) }}</td>
              <td class="px-4 py-3 text-center">
                <el-tag :type="getStatusTagType(item.status)" size="small" effect="dark">{{ item.status }}</el-tag>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="h-[200px] flex items-center justify-center text-text-muted text-sm">
        暂无数据，请先设置充电线价格
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-5">
        <div class="flex items-center gap-2 mb-4">
          <Palette class="w-5 h-5 text-electric" />
          <h3 class="font-heading text-base font-semibold text-white tracking-wider">颜色分布</h3>
        </div>
        <VChart v-if="colorStatsData.length > 0" :option="colorPieOption" style="height: 260px; width: 100%" autoresize />
        <div v-else class="h-[260px] flex items-center justify-center text-text-muted text-sm">
          暂无数据
        </div>
      </div>

      <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-5">
        <div class="flex items-center gap-2 mb-4">
          <Ruler class="w-5 h-5 text-electric" />
          <h3 class="font-heading text-base font-semibold text-white tracking-wider">长度分布</h3>
        </div>
        <VChart v-if="lengthStatsData.length > 0" :option="lengthBarOption" style="height: 260px; width: 100%" autoresize />
        <div v-else class="h-[260px] flex items-center justify-center text-text-muted text-sm">
          暂无数据
        </div>
      </div>
    </div>
  </div>
</template>
