import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { post, get } from '@/composables/useApi'
import router from '@/router'

interface AuthData {
  token: string
  user: { id: number; username: string }
}

interface MeData {
  user: { id: number; username: string }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<{ id: number; username: string } | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  async function login(username: string, password: string) {
    const res = await post<AuthData>('/api/auth/login', { username, password })
    if (res.success) {
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('token', res.data.token)
      router.push('/')
    }
    return res
  }

  async function register(username: string, password: string) {
    const res = await post<AuthData>('/api/auth/register', { username, password })
    if (res.success) {
      token.value = res.data.token
      user.value = res.data.user
      localStorage.setItem('token', res.data.token)
      router.push('/')
    }
    return res
  }

  async function fetchMe() {
    const res = await get<MeData>('/api/auth/me')
    if (res.success) {
      user.value = res.data.user
    }
    return res
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    router.push('/login')
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    register,
    fetchMe,
    logout,
  }
})
