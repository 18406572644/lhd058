<script setup lang="ts">
import { type Component } from 'vue'

defineProps<{
  title: string
  value: number | string
  icon: Component
  color?: string
}>()
</script>

<template>
  <div
    class="group relative bg-space-deep/60 border border-electric/10 rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(15,188,249,0.12)] hover:border-electric/25"
  >
    <div class="flex items-start justify-between">
      <div>
        <p class="text-text-muted text-xs font-heading uppercase tracking-wider mb-1">{{ title }}</p>
        <p
          class="font-heading text-3xl font-bold"
          :style="{ color: color || 'var(--accent)' }"
        >
          {{ value }}
        </p>
      </div>
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center"
        :style="{ backgroundColor: (color || 'var(--accent)') + '15' }"
      >
        <component :is="icon" class="w-5 h-5" :style="{ color: color || 'var(--accent)' }" />
      </div>
    </div>
    <div
      class="absolute bottom-0 left-0 h-0.5 rounded-b-xl transition-all duration-500 w-0 group-hover:w-full"
      :style="{ backgroundColor: color || 'var(--accent)' }"
    ></div>
  </div>
</template>
