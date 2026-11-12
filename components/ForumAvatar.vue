<script setup lang="ts">
import { Beanhead } from 'beanheads-vue'
import type { ForumAvatar } from '~/shared/forum/contracts'

const props = withDefaults(defineProps<{
  avatar: ForumAvatar
  name: string
  size?: 'sm' | 'md' | 'lg'
}>(), { size: 'md' })

const failed = ref(false)
watch(() => props.avatar, () => { failed.value = false }, { deep: true })
onErrorCaptured(() => {
  failed.value = true
  return false
})
</script>

<template>
  <span class="forum-avatar" :class="`forum-avatar--${size}`" :aria-label="`${name}的头像`" role="img">
    <img
      v-if="avatar.type === 'managed' && avatar.url && !failed"
      :src="avatar.url"
      alt=""
      loading="lazy"
      decoding="async"
      @error="failed = true"
    >
    <!-- Each Beanhead renders a ~20 KB inline SVG; keep it out of SSR HTML. -->
    <ClientOnly v-else-if="avatar.type === 'beanhead' && avatar.beanhead && !failed">
      <Beanhead v-bind="avatar.beanhead" aria-hidden="true" />
      <template #fallback>
        <span class="forum-avatar__fallback" aria-hidden="true">{{ avatar.fallbackText }}</span>
      </template>
    </ClientOnly>
    <span v-else class="forum-avatar__fallback" aria-hidden="true">{{ avatar.fallbackText }}</span>
  </span>
</template>
