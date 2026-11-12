<script setup lang="ts">
import type { Article } from '~/shared/content/articles'
import { articlePublicSlug, knowledgeArticlePath } from '~/shared/content/knowledge'

defineProps<{ articles: Article[] }>()

const failedCoverImages = ref(new Set<string>())

function hasVisibleCover(imageUrl?: string) {
  return Boolean(imageUrl && !failedCoverImages.value.has(imageUrl))
}

function markCoverImageFailed(imageUrl?: string) {
  if (!imageUrl) return
  failedCoverImages.value = new Set([...failedCoverImages.value, imageUrl])
}
</script>

<template>
  <div class="article-list">
    <article
      v-for="article in articles"
      :key="article.slug"
      class="article-list__item"
      :class="{ 'article-list__item--with-cover': hasVisibleCover(article.coverImageUrl) }"
    >
      <NuxtLink
        v-if="hasVisibleCover(article.coverImageUrl)"
        class="article-list__cover"
        :to="knowledgeArticlePath(articlePublicSlug(article))"
        :aria-label="`查看文章：${article.title}`"
      >
        <img
          :src="article.coverImageUrl"
          :alt="article.title"
          loading="lazy"
          decoding="async"
          @error="markCoverImageFailed(article.coverImageUrl)"
        >
      </NuxtLink>
      <div class="article-list__body">
        <div class="article-list__meta">
          <p class="eyebrow">{{ article.category?.name || article.type }}</p>
          <time v-if="article.publishedAt" :datetime="article.publishedAt">
            {{ new Date(article.publishedAt).toLocaleDateString('zh-CN') }}
          </time>
        </div>
        <NuxtLink
          class="article-list__text-link"
          :to="knowledgeArticlePath(articlePublicSlug(article))"
          :aria-label="`查看文章：${article.title}`"
        >
          <h2>{{ article.title }}</h2>
          <p v-if="article.excerpt" class="article-list__excerpt">{{ article.excerpt }}</p>
        </NuxtLink>
      </div>
    </article>
  </div>
</template>
