<script setup lang="ts">
import { FolderOpen, MessageSquare, ScanLine, Settings2 } from 'lucide-vue-next'

const props = defineProps<{ icon?: string, size?: number }>()

const icons = {
  'i-lucide-message-square': MessageSquare,
  'i-lucide-scan-line': ScanLine,
  'i-lucide-settings-2': Settings2,
} as const

const iconComponent = computed(() => icons[props.icon as keyof typeof icons] || FolderOpen)
</script>

<template>
  <component :is="iconComponent" :size="size || 22" :stroke-width="1.8" aria-hidden="true" />
</template>
