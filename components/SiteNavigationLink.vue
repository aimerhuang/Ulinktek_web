<script setup lang="ts">
import type { SiteNavigationItem } from '~/shared/content/navigation'

const props = defineProps<{ item: SiteNavigationItem }>()
defineEmits<{ navigate: [] }>()

// Keep the published legacy FAQ link usable until the CMS navigation migration runs.
const target = computed(() => props.item.to === '/zh/support#faq' ? '/zh/faq' : props.item.to)
</script>

<template>
  <a
    v-if="item.external"
    :href="target"
    :target="item.openInNewWindow ? '_blank' : undefined"
    :rel="item.openInNewWindow ? 'noopener noreferrer' : undefined"
    @click="$emit('navigate')"
  >{{ item.label }}</a>
  <NuxtLink
    v-else
    :to="target"
    :target="item.openInNewWindow ? '_blank' : undefined"
    :rel="item.openInNewWindow ? 'noopener noreferrer' : undefined"
    @click="$emit('navigate')"
  >{{ item.label }}</NuxtLink>
</template>
