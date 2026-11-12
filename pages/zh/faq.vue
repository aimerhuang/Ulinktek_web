<script setup lang="ts">
import { serializeJsonLd } from '~/shared/content/structured-data'

const faqTitle = useNavigationLabel('/zh/faq')
const { getFaqs } = useContentApi()
const faqs = await getFaqs()
const categories = computed(() => [...new Set(faqs.map(faq => faq.category))])
const categoryGroups = computed(() => categories.value.map((category, index) => ({
  category,
  anchor: `faq-category-${index + 1}`,
  items: faqs.filter(faq => faq.category === category),
})))

usePageSeo({
  title: faqTitle,
  description: '查看优联科技管道检测设备的常见问题、验收标准与使用说明。',
  path: '/zh/faq',
})

if (faqs.length) {
  useHead({ script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    }),
  }] })
}
</script>

<template>
  <section class="section faq-page">
    <div class="page-width faq-page__inner">
      <header class="faq-page__heading">
        <h1>{{ faqTitle }}</h1>
        <p>按类别查找产品使用、验收和服务相关问题。</p>
      </header>

      <template v-if="faqs.length">
        <nav class="faq-categories" aria-label="常见问题分类">
          <NuxtLink
            v-for="group in categoryGroups"
            :key="group.category"
            :to="{ path: '/zh/faq', hash: `#${group.anchor}` }"
          >{{ group.category }}</NuxtLink>
        </nav>

        <section v-for="group in categoryGroups" :id="group.anchor" :key="group.category" class="faq-category-group" :aria-labelledby="`${group.anchor}-title`">
          <h2 :id="`${group.anchor}-title`">{{ group.category }}</h2>
          <div class="faq-list faq-list--categorized">
            <details v-for="faq in group.items" :key="faq.slug">
              <summary>{{ faq.question }}</summary>
              <p>{{ faq.answer }}</p>
            </details>
          </div>
        </section>
      </template>

      <div v-else class="empty-state faq-page__empty">
        <h2>常见问题正在更新</h2>
        <p>审核后的常见问题会自动显示在这里。</p>
      </div>
    </div>
  </section>
</template>
