<script setup lang="ts">
import type { SiteNavigationItem } from '~/shared/content/navigation'
import { getBreadcrumbs } from '~/shared/content/breadcrumbs'
import type { PageBreadcrumbCurrent } from '~/composables/usePageBreadcrumbLabel'

const props = defineProps<{ navigation: SiteNavigationItem[] }>()
const route = useRoute()
const pageCurrent = useState<PageBreadcrumbCurrent | undefined>('page-breadcrumb-current', () => undefined)
const breadcrumbs = computed(() => {
  const items = getBreadcrumbs(props.navigation, { path: route.path, query: route.query })
  if (pageCurrent.value?.path !== route.path || !items.length) return items
  const current = { ...items.at(-1)!, label: pageCurrent.value.label }
  const parents = (pageCurrent.value.parents || [])
    .filter(parent => !items.some(item => item.to === parent.to))
    .map(parent => ({ label: parent.label, to: parent.to, external: false, openInNewWindow: false, current: false }))
  return [...items.slice(0, -1), ...parents, current]
})
</script>

<template>
  <nav v-if="breadcrumbs.length" class="site-breadcrumb" aria-label="当前位置">
    <ol class="page-width">
      <li v-for="item in breadcrumbs" :key="`${item.label}-${item.to}`">
        <span v-if="item.current" aria-current="page">{{ item.label }}</span>
        <a v-else-if="item.external" :href="item.to" :target="item.openInNewWindow ? '_blank' : undefined" :rel="item.openInNewWindow ? 'noopener noreferrer' : undefined">{{ item.label }}</a>
        <NuxtLink v-else :to="item.to">{{ item.label }}</NuxtLink>
      </li>
    </ol>
  </nav>
</template>
