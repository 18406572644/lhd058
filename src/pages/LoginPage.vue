<script setup lang="ts">
import { ref, computed, markRaw } from 'vue'
import { Cable, User, Lock } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const isLogin = ref(true)
const username = ref('')
const password = ref('')
const loading = ref(false)

const UserIcon = markRaw(User)
const LockIcon = markRaw(Lock)

const modeLabel = computed(() => isLogin.value ? '登 录' : '注 册')
const toggleLabel = computed(() => isLogin.value ? '还没有账号？立即注册' : '已有账号？去登录')

async function handleSubmit() {
  if (!username.value.trim() || !password.value.trim()) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  try {
    const res = isLogin.value
      ? await authStore.login(username.value, password.value)
      : await authStore.register(username.value, password.value)
    if (res.success) {
      ElMessage.success(isLogin.value ? '登录成功' : '注册成功')
    } else {
      ElMessage.error(res.error || '操作失败')
    }
  } catch {
    ElMessage.error('网络错误，请检查连接')
  } finally {
    loading.value = false
  }
}

function toggleMode() {
  isLogin.value = !isLogin.value
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-space-dark relative overflow-hidden">
    <div class="absolute inset-0" style="background-image: linear-gradient(rgba(15,188,249,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,188,249,0.04) 1px, transparent 1px); background-size: 40px 40px;"></div>

    <div class="absolute top-20 left-20 w-64 h-64 rounded-full opacity-20" style="background: radial-gradient(circle, #0fbcf9, transparent 70%); filter: blur(40px);"></div>
    <div class="absolute bottom-20 right-20 w-80 h-80 rounded-full opacity-10" style="background: radial-gradient(circle, #00d2ff, transparent 70%); filter: blur(60px);"></div>

    <div class="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
      <div class="bg-space-deep/80 backdrop-blur-xl border border-electric/20 rounded-2xl p-8 shadow-[0_0_60px_rgba(15,188,249,0.1)]">
        <div class="flex flex-col items-center mb-8">
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-electric/20 to-transparent flex items-center justify-center mb-4 animate-glow border border-electric/30">
            <Cable class="w-10 h-10 text-electric" />
          </div>
          <h1 class="font-heading text-3xl font-bold text-white tracking-wider">CableMgr</h1>
          <p class="text-text-muted text-sm mt-2 font-heading tracking-wide">充电线管理系统</p>
        </div>

        <div class="flex mb-8 rounded-xl overflow-hidden border border-electric/15 bg-space-dark/50">
          <button
            @click="isLogin = true"
            :class="[
              'flex-1 py-3 text-center font-heading text-sm font-semibold transition-all duration-300 tracking-wider',
              isLogin ? 'bg-electric/20 text-electric shadow-inner' : 'bg-transparent text-text-muted hover:text-white'
            ]"
          >
            登 录
          </button>
          <button
            @click="isLogin = false"
            :class="[
              'flex-1 py-3 text-center font-heading text-sm font-semibold transition-all duration-300 tracking-wider',
              !isLogin ? 'bg-electric/20 text-electric shadow-inner' : 'bg-transparent text-text-muted hover:text-white'
            ]"
          >
            注 册
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <div>
            <label class="block text-text-muted text-xs font-heading mb-2 tracking-wider uppercase">用户名</label>
            <el-input
              v-model="username"
              placeholder="请输入用户名 (3-20字符)"
              size="large"
              :prefix-icon="UserIcon"
            />
          </div>
          <div>
            <label class="block text-text-muted text-xs font-heading mb-2 tracking-wider uppercase">密码</label>
            <el-input
              v-model="password"
              type="password"
              placeholder="请输入密码 (至少6位)"
              size="large"
              :prefix-icon="LockIcon"
              show-password
            />
          </div>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleSubmit"
            class="w-full font-heading tracking-widest"
          >
            {{ modeLabel }}
          </el-button>
        </form>

        <div class="mt-6 text-center">
          <button
            @click="toggleMode"
            class="text-sm text-text-muted hover:text-electric transition-colors font-heading tracking-wide"
          >
            {{ toggleLabel }}
          </button>
        </div>
      </div>

      <p class="text-center text-text-muted/50 text-xs font-heading mt-6 tracking-wider">
        科技极简风 · 充电线全生命周期管理
      </p>
    </div>
  </div>
</template>
