<script setup lang="ts">
import type { ContactInfo, SiteSettings } from '~/composables/useContentApi'
import type { SiteNavigationItem } from '~/shared/content/navigation'

defineProps<{ navigation: SiteNavigationItem[], contact: ContactInfo, settings: SiteSettings }>()
const isMenuOpen = ref(false)
const navigationResetKey = ref(0)
const menuToggle = ref<HTMLButtonElement>()
const navigationElement = ref<HTMLElement>()

function closeMenu(restoreFocus = false) {
  isMenuOpen.value = false
  navigationResetKey.value += 1
  if (restoreFocus) nextTick(() => menuToggle.value?.focus())
}

function toggleMenu() {
  if (isMenuOpen.value) {
    closeMenu()
    return
  }
  isMenuOpen.value = true
  nextTick(() => navigationElement.value?.querySelector<HTMLElement>('a, button')?.focus())
}

function handleNavigationKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isMenuOpen.value) {
    event.preventDefault()
    closeMenu(true)
  }
}
</script>

<template>
  <header class="site-header">
    <div class="page-width nav-row">
      <div class="wordmark-heading">
        <NuxtLink class="wordmark" to="/" :aria-label="`${settings.siteName || '优联科技'}首页`">
          <img class="wordmark__image" src="/images/ulinktek-logo.png" :alt="settings.siteName || '优联科技'" width="310" height="72">
        </NuxtLink>
      </div>
      <nav id="main-navigation" ref="navigationElement" class="main-navigation" :class="{ 'is-open': isMenuOpen }" aria-label="主导航" @keydown="handleNavigationKeydown">
        <SiteNavigationItem v-for="item in navigation" :key="item.id" :item="item" :reset-key="navigationResetKey" @navigate="closeMenu()" />
      </nav>
      <div class="nav-utility">
        <!-- Session state lives in the browser; server-rendered account links would precede every page's main content for crawlers. -->
        <ClientOnly>
          <ForumAccountBar />
          <template #fallback><div class="forum-account-bar forum-account-bar--placeholder" aria-hidden="true" /></template>
        </ClientOnly>
        <div class="nav-service"><span>全国服务热线</span><a :href="`tel:${contact.phone}`">{{ contact.phone }}</a></div>
      </div>
      <button ref="menuToggle" class="menu-toggle" type="button" :aria-expanded="isMenuOpen" aria-controls="main-navigation" aria-label="切换主导航" @click="toggleMenu">
        <span /><span /><span />
      </button>
    </div>
  </header>
</template>
