<script setup lang="ts">
import { truncatePublicationText } from '~/shared/content/product-publication'
import { absoluteSiteUrl, organizationEntityId, serializeJsonLd, websiteEntityId } from '~/shared/content/structured-data'

const { getAbout } = useContentApi()
const aboutTitle = useNavigationLabel('/zh/about')
const profile = await getAbout()
const brandImageUrl = computed(() => profile.brandImageUrl)
const aboutDescription = truncatePublicationText(profile.brandIntro || '', 150) || '了解优联科技已发布的品牌介绍与认证资料。'

usePageSeo({
  title: aboutTitle,
  description: aboutDescription,
  path: '/zh/about',
})

const config = useRuntimeConfig()
const aboutUrl = absoluteSiteUrl(config.public.siteUrl, '/zh/about')
useHead(() => ({
  script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      '@id': aboutUrl,
      url: aboutUrl,
      name: aboutTitle.value,
      description: aboutDescription,
      isPartOf: { '@id': websiteEntityId(config.public.siteUrl) },
      about: { '@id': organizationEntityId(config.public.siteUrl) },
      mainEntity: { '@id': organizationEntityId(config.public.siteUrl) },
      ...(brandImageUrl.value ? { primaryImageOfPage: absoluteSiteUrl(config.public.siteUrl, brandImageUrl.value) } : {}),
    }),
  }],
}))
</script>

<template>
  <h1 class="visually-hidden">{{ aboutTitle }}</h1>
  <section class="section about-intro"><div class="page-width solution-layout" :class="{ 'solution-layout--text-only': !brandImageUrl }"><MediaPlaceholder v-if="brandImageUrl" kind="scene" :label="profile.brandTitle || '工厂与团队'" :alt="profile.brandTitle || '优联科技工厂与团队'" :src="brandImageUrl" /><div><h2>{{ profile.brandTitle || '品牌介绍' }}</h2><div v-if="profile.brandIntroHtml" class="rich-content about-intro__rich-content" v-html="profile.brandIntroHtml" /><p v-else-if="profile.brandIntro" class="about-intro__plain">{{ profile.brandIntro }}</p><div v-else class="empty-state"><h3>品牌资料正在整理</h3><p>公司历史、研发制造能力和公开信息将在完成审核后发布。</p></div></div></div></section>
</template>
