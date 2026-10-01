import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { nextTick } from 'vue'

const routes = [
  { path: '/forgot-password', component: () => import('../pages/PasswordRecoveryPage.vue') },
  { path: '/reset-password', component: () => import('../pages/PasswordRecoveryPage.vue') },
  { path: '/classes', component: () => import('../pages/ClassCatalogPage.vue'), meta: { requiresAuth: true } },
  { path: '/characters/new', component: () => import('../pages/CharacterCreationPage.vue'), meta: { requiresAuth: true } },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/LoginPage.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../pages/RegisterPage.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../pages/DashboardPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard/judge',
    name: 'JudgeDashboard',
    component: () => import('../pages/JudgeDashboardPage.vue'),
    meta: { requiresAuth: true, requiresMaster: true },
  },
  {
    path: '/campaigns',
    name: 'Campaigns',
    component: () => import('../pages/CampaignsPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/campaigns/:id/manage',
    name: 'CampaignManagement',
    component: () => import('../pages/CampaignManagementPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/character/:id',
    name: 'CharacterSheet',
    component: () => import('../pages/CharacterSheetPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('../pages/NotFoundPage.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) { return savedPosition || { top: 0 } },
})

const pageTitles: Record<string, string> = {
  '/login': 'Entrar', '/register': 'Criar conta', '/forgot-password': 'Recuperar acesso',
  '/reset-password': 'Redefinir senha', '/dashboard': 'Personagens', '/dashboard/judge': 'Painel do mestre',
  '/campaigns': 'Campanhas', '/classes': 'Classes', '/characters/new': 'Criar personagem',
}
router.afterEach(async (to, from, failure) => {
  if (failure) return
  const title = pageTitles[to.path] || (to.name === 'CharacterSheet' ? 'Ficha de personagem' :
    to.name === 'CampaignManagement' ? 'Gerenciar campanha' : 'Página não encontrada')
  document.title = `${title} — ACKS II`
  if (from.matched.length && to.path !== from.path) {
    await nextTick()
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.meta.requiresMaster && !authStore.isMaster) {
    next('/dashboard')
  } else if ((to.name === 'Login' || to.name === 'Register') && authStore.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
