<script setup lang="ts">
import { Pin } from 'lucide-vue-next'
import { formatForumDate, forumExcerpt } from '~/shared/forum/presentation'
import type { ForumPost } from '~/shared/forum/contracts'

defineProps<{
  posts: ForumPost[]
  showCategory?: boolean
}>()
</script>

<template>
  <div class="forum-board">
    <div class="forum-board__header" aria-hidden="true">
      <span>主题</span><span>浏览</span><span>评论</span><span>发布时间</span>
    </div>
    <article v-for="post in posts" :key="post.id" class="forum-post-row" :class="{ 'forum-post-row--pinned': post.isGloballyPinned }">
      <div class="forum-post-row__content">
        <div class="forum-post-row__labels">
          <NuxtLink v-if="showCategory" class="forum-post-row__category" :to="`/zh/forum/category/${post.category.id}`">
            <ForumCategoryIcon :icon="post.category.icon" :size="14" />{{ post.category.name }}
          </NuxtLink>
          <span v-if="post.postType === 'announcement'" class="forum-post-badge forum-post-badge--announcement">公告</span>
          <span v-if="post.isGloballyPinned" class="forum-post-badge forum-post-badge--pinned"><Pin :size="12" aria-hidden="true" />置顶</span>
        </div>
        <h2><NuxtLink :to="`/zh/forum/${post.id}`">{{ post.title }}</NuxtLink></h2>
        <p>{{ forumExcerpt(post.body) }}</p>
        <NuxtLink class="forum-post-row__author" :to="`/zh/forum/users/${post.authorId}`">
          <ForumAvatar :avatar="post.authorAvatar" :name="post.displayName" size="sm" />
          <span>{{ post.displayName }}</span>
          <small v-if="post.authorProfession">{{ post.authorProfession }}</small>
        </NuxtLink>
      </div>
      <span class="forum-post-row__views"><span class="forum-mobile-label">浏览</span>{{ post.viewCount }}</span>
      <span class="forum-post-row__comments"><span class="forum-mobile-label">评论</span>{{ post.commentCount }}</span>
      <time class="forum-post-row__date" :datetime="post.publishedAt">{{ formatForumDate(post.publishedAt) }}</time>
    </article>
  </div>
</template>
