<script setup lang="ts">
import { KNOWLEDGE_BASE_PATH } from '~/shared/content/knowledge'

// The category directory has no page of its own; the knowledge base root lists every category.
await navigateTo(KNOWLEDGE_BASE_PATH, { redirectCode: 301, replace: true })
</script>

<template>
  <div />
</template>
