<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent])

interface MonthlyItem {
  month: string
  added: number
  damaged: number
  lost: number
}

const props = defineProps<{
  data: MonthlyItem[]
}>()

const option = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(22, 33, 62, 0.95)',
    borderColor: 'rgba(15, 188, 249, 0.2)',
    textStyle: { color: '#fff', fontFamily: 'Rajdhani, sans-serif' },
  },
  legend: {
    data: ['新增', '损坏', '丢失'],
    textStyle: { color: '#8892b0', fontFamily: 'Rajdhani, sans-serif' },
    top: 0,
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: 40,
    containLabel: true,
  },
  xAxis: {
    type: 'category',
    data: props.data.map((d) => d.month),
    axisLine: { lineStyle: { color: 'rgba(15, 188, 249, 0.15)' } },
    axisLabel: { color: '#8892b0', fontFamily: 'Rajdhani, sans-serif' },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    splitLine: { lineStyle: { color: 'rgba(15, 188, 249, 0.06)' } },
    axisLabel: { color: '#8892b0', fontFamily: 'Rajdhani, sans-serif' },
  },
  series: [
    {
      name: '新增',
      type: 'bar',
      data: props.data.map((d) => d.added),
      itemStyle: { color: '#0fbcf9', borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 24,
    },
    {
      name: '损坏',
      type: 'bar',
      data: props.data.map((d) => d.damaged),
      itemStyle: { color: '#5a6987', borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 24,
    },
    {
      name: '丢失',
      type: 'bar',
      data: props.data.map((d) => d.lost),
      itemStyle: { color: '#3a4260', borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 24,
    },
  ],
}))
</script>

<template>
  <div class="bg-space-deep/60 border border-electric/10 rounded-xl p-5">
    <h3 class="font-heading text-base font-semibold text-white mb-4 tracking-wider">月度消耗统计</h3>
    <VChart :option="option" style="height: 280px; width: 100%" autoresize />
  </div>
</template>
