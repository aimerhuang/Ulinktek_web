<script setup lang="ts">
import type { LegalDocumentType } from '~/shared/content/legal-documents'

const props = defineProps<{
  type: LegalDocumentType
  title: string
}>()

const { state, load } = useLegalDocument(props.type)
onMounted(load)
</script>

<template>
  <section class="legal-page page-width">
    <h1>{{ title }}</h1>
    <div v-if="state.status === 'configured' && state.document" class="legal-document rich-content" v-html="state.document.contentHtml" />
    <div v-else-if="state.status === 'unconfigured'" class="legal-status" role="status">
      <h2>{{ title }}尚未配置</h2>
      <p>相关内容将在管理员完成配置后显示。</p>
    </div>
    <div v-else-if="state.status === 'error'" class="legal-status" role="alert">
      <h2>内容加载失败</h2>
      <p>{{ state.error }}</p>
      <button class="button button--secondary" type="button" @click="load">重新加载</button>
    </div>
    <div v-else class="legal-status" role="status" aria-live="polite">
      <h2>正在加载</h2>
      <p>正在获取最新内容。</p>
    </div>
  </section>
</template>
