<script setup lang="ts">
import { KNOWLEDGE_BASE_PATH, knowledgeCategoryPath } from '~/shared/content/knowledge'
import { visibleKnowledgeCategories, type KnowledgeCategory } from '~/shared/content/knowledge-categories'

const props = defineProps<{ categories: KnowledgeCategory[], currentSlug?: string }>()

const items = computed(() => [
  { key: 'all', label: '全部', to: KNOWLEDGE_BASE_PATH, current: !props.currentSlug },
  ...visibleKnowledgeCategories(props.categories).map(category => ({
    key: category.slug,
    label: category.name,
    to: knowledgeCategoryPath(category.slug),
    current: category.slug === props.currentSlug,
  })),
])
</script>

<template>
  <nav v-if="items.length > 1" class="knowledge-category-tabs" aria-label="知识库分类">
    <ul>
      <li v-for="item in items" :key="item.key">
        <NuxtLink :to="item.to" :class="{ 'is-current': item.current }" :aria-current="item.current ? 'page' : undefined">{{ item.label }}</NuxtLink>
      </li>
    </ul>
  </nav>
</template>
