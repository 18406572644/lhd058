<script setup lang="ts">
import { ref, onMounted, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { LayoutDashboard, Cable, LogOut, User, PanelLeft } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const collapsed = ref(false)
const username = ref('')

const LayoutDashboardIcon = markRaw(LayoutDashboard)
const CableIcon = markRaw(Cable)
const LogOutIcon = markRaw(LogOut)
const UserIcon = markRaw(User)
const PanelLeftIcon = markRaw(PanelLeft)

onMounted(async () => {
  const res = await authStore.fetchMe()
  if (res.success && res.data && res.data.user?.username) {
    username.value = res.data.user.username
  }
})

function handleLogout() {
  authStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}

function isActive(path: string) {
  return router.currentRoute.value.path === path ||
    (path === '/' && router.currentRoute.value.path === '/') ||
    (path !== '/' && router.currentRoute.value.path.startsWith(path))
}
</script>

<template>
  <div class="flex h-screen bg-space-dark overflow-hidden">
    <aside
      :class="[
        'transition-all duration-300 flex flex-col bg-space-deep/80 border-r border-electric/10 backdrop-blur-xl',
        collapsed ? 'w-16' : 'w-56'
      ]"
    >
      <div class="h-16 flex items-center justify-center border-b border-electric/10 px-4">
        <div v-if="!collapsed" class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-electric/20 flex items-center justify-center">
            <component :is="CableIcon" class="w-4 h-4 text-electric" />
          </div>
          <span class="font-heading text-white font-bold text-lg tracking-wider">CableMgr</span>
        </div>
        <div v-else class="w-8 h-8 rounded-lg bg-electric/20 flex items-center justify-center">
          <component :is="CableIcon" class="w-4 h-4 text-electric" />
        </div>
      </div>

      <nav class="flex-1 py-4 px-2 space-y-1">
        <router-link
          to="/"
          :class="[
            'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 font-heading text-sm tracking-wide',
            isActive('/')
              ? 'bg-electric/15 text-electric border border-electric/20'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          ]"
        >
          <component :is="LayoutDashboardIcon" class="w-5 h-5 flex-shrink-0" />
          <span v-if="!collapsed" class="truncate">仪表盘</span>
        </router-link>

        <router-link
          to="/cables"
          :class="[
            'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 font-heading text-sm tracking-wide',
            isActive('/cables')
              ? 'bg-electric/15 text-electric border border-electric/20'
              : 'text-text-muted hover:text-white hover:bg-white/5'
          ]"
        >
          <component :is="CableIcon" class="w-5 h-5 flex-shrink-0" />
          <span v-if="!collapsed" class="truncate">充电线管理</span>
        </router-link>
      </nav>

      <div class="p-2 border-t border-electric/10">
        <button
          @click="collapsed = !collapsed"
          class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all font-heading text-sm"
        >
          <component :is="PanelLeftIcon" :class="['w-4 h-4 transition-transform duration-300', collapsed ? 'rotate-180' : '']" />
          <span v-if="!collapsed">{{ collapsed ? '' : '收起侧栏' }}</span>
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col overflow-hidden">
      <header class="h-16 bg-space-deep/50 border-b border-electric/10 backdrop-blur-md px-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="font-heading text-xl font-semibold text-white tracking-wide">
            {{ router.currentRoute.value.path === '/' ? '仪表盘' : router.currentRoute.value.path.startsWith('/cables/') ? '充电线详情' : '充电线管理' }}
          </h1>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
            <component :is="UserIcon" class="w-4 h-4 text-electric" />
            <span class="font-heading text-sm text-white">{{ username || '用户' }}</span>
          </div>
          <button
            @click="handleLogout"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-all font-heading text-sm"
          >
            <component :is="LogOutIcon" class="w-4 h-4" />
            <span>退出</span>
          </button>
        </div>
      </header>

      <main class="flex-1 overflow-auto p-6">
        <div class="max-w-[1440px] mx-auto">
          <transition name="page" mode="out-in">
            <router-view />
          </transition>
        </div>
      </main>
    </div>
  </div>
</template>
