<script setup lang="ts">
import { decodeAmapLocation } from '~/shared/content/contact-map'
import { absoluteSiteUrl, organizationEntityId, serializeJsonLd, websiteEntityId } from '~/shared/content/structured-data'

const contactTitle = useNavigationLabel('/zh/contact')
const contactDescription = '提交产品选型、资料或报价咨询。优联科技将根据您关注的产品型号和页面来源进行跟进。'
usePageSeo({
  title: contactTitle,
  description: contactDescription,
  path: '/zh/contact',
})
const route = useRoute()
const productModel = typeof route.query.product === 'string' ? route.query.product : undefined
const config = useRuntimeConfig()
const { getDisplayContact } = useContentApi()
const contact = await getDisplayContact()
const phone = contact.phone
const emails = contact.emails
const address = contact.address
const mapLocation = decodeAmapLocation({
  ...contact,
  companyName: contact.companyName || config.public.siteName,
})
const amapKey = config.public.amapKey.trim()

const contactUrl = absoluteSiteUrl(config.public.siteUrl, '/zh/contact')
useHead(() => ({
  script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      '@id': contactUrl,
      url: contactUrl,
      name: contactTitle.value,
      description: contactDescription,
      isPartOf: { '@id': websiteEntityId(config.public.siteUrl) },
      about: { '@id': organizationEntityId(config.public.siteUrl) },
      mainEntity: { '@id': organizationEntityId(config.public.siteUrl) },
    }),
  }],
}))
</script>

<template>
  <h1 class="visually-hidden">{{ contactTitle }}</h1>
  <section class="section">
    <div class="page-width contact-layout contact-layout--details">
      <div class="contact-details">
        <h2>联系信息</h2>
        <p><strong>电话：</strong><a :href="`tel:${phone}`">{{ phone }}</a></p>
        <p v-for="item in emails" :key="item.address"><strong>{{ item.label || '邮箱' }}：</strong><a :href="`mailto:${item.address}`">{{ item.address }}</a></p>
        <p><strong>地址：</strong>{{ address }}</p>
        <ContactMap :location="mapLocation" :api-key="amapKey" />
      </div>
      <InquiryForm :product-model="productModel" />
    </div>
  </section>
</template>
