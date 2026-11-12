<script setup lang="ts">
import { certificateCollectionEntity } from '~/shared/content/certificates'
import { serializeJsonLd } from '~/shared/content/structured-data'

const { getCertificates } = useContentApi()
const certificateTitle = useNavigationLabel('/zh/about/certificate')
const certificates = await getCertificates()

usePageSeo({
  title: certificateTitle,
  description: '查看优联科技已发布证书与资质的编号、签发机构、有效期和适用型号。',
  path: '/zh/about/certificate',
})

const config = useRuntimeConfig()
useHead(() => ({
  script: [{
    key: 'certificate-jsonld',
    type: 'application/ld+json',
    innerHTML: serializeJsonLd(certificateCollectionEntity(config.public.siteUrl, '/zh/about/certificate', certificateTitle.value, certificates)),
  }],
}))
</script>

<template>
  <section class="section section--quiet certificate-page">
    <div class="page-width">
      <div class="section-heading">
        <h1>{{ certificateTitle }}</h1>
      </div>
      <div v-if="certificates.length" class="certificate-grid">
        <article v-for="certificate in certificates" :id="`certificate-${certificate.id}`" :key="certificate.id" class="certificate-item">
          <MediaPlaceholder :label="certificate.title" :alt="certificate.title" :src="certificate.imageUrl" />
          <h2>{{ certificate.title }}</h2>
        </article>
      </div>
      <div v-else class="empty-state">
        <h2>证书内容正在整理</h2>
        <p>已发布的证书和资质图片将在这里显示。</p>
      </div>
    </div>
  </section>
</template>
