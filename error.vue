<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const config = useRuntimeConfig()

const statusCode = computed(() => props.error.statusCode || 500)
// Only missing pages reuse the site shell; upstream failures must not trigger another shell load.
const notFound = computed(() => statusCode.value === 404 || statusCode.value === 410)
const heading = computed(() => {
  if (notFound.value) return '页面不存在或已下线'
  if (statusCode.value === 503) return '服务暂时不可用'
  return '页面暂时无法显示'
})
const message = computed(() => notFound.value
  ? '您访问的页面可能已移动、下线或地址有误。可以从下列入口继续浏览。'
  : '请稍后刷新重试，或通过电话 / 邮件联系我们。')
const links = [
  { label: '返回首页', to: '/' },
  { label: '产品中心', to: '/zh/products' },
  { label: '管道检测知识库', to: '/zh/knowledge' },
  { label: '联系我们', to: '/zh/contact' },
]

useHead({
  title: () => `${heading.value} | ${config.public.siteName}`,
  htmlAttrs: { lang: 'zh-CN' },
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
}, { tagPriority: 'high' }) // The nested layout registers its default title later.
</script>

<template>
  <NuxtLayout v-if="notFound">
    <section class="legal-page page-width error-page">
      <p class="error-page__code">{{ statusCode }}</p>
      <h1>{{ heading }}</h1>
      <p>{{ message }}</p>
      <nav class="error-page__links" aria-label="继续浏览">
        <NuxtLink v-for="(link, index) in links" :key="link.to" :to="link.to" class="button" :class="index === 0 ? 'button--primary' : 'button--secondary'">{{ link.label }}</NuxtLink>
      </nav>
    </section>
  </NuxtLayout>
  <main v-else class="legal-page page-width error-page">
    <a href="/" class="error-page__brand"><img src="/images/ulinktek-logo.png" :alt="config.public.siteName" width="310" height="72"></a>
    <p class="error-page__code">{{ statusCode }}</p>
    <h1>{{ heading }}</h1>
    <p>{{ message }}</p>
    <nav class="error-page__links" aria-label="继续浏览">
      <a v-for="(link, index) in links" :key="link.to" :href="link.to" class="button" :class="index === 0 ? 'button--primary' : 'button--secondary'">{{ link.label }}</a>
    </nav>
  </main>
</template>
