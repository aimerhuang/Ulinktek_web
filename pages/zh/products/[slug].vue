<script setup lang="ts">
import { productSpecificationRows } from '~/shared/content/product-publication'
import { resolveProductSlug } from '~/shared/content/product-slug-redirects'
import { isCanonicalProductCategorySlug, productCategoryPath } from '~/shared/content/product-category'
import { absoluteSiteUrl, breadcrumbListEntity, organizationEntityId, serializeJsonLd } from '~/shared/content/structured-data'

const route = useRoute()
const { getProductBySlug } = useContentApi()
const requestedSlug = String(route.params.slug)
const normalizedRequestedSlug = requestedSlug.normalize('NFKC').trim()
const canonicalSlug = resolveProductSlug(requestedSlug)
if (canonicalSlug !== normalizedRequestedSlug) {
  await navigateTo(`/zh/products/${canonicalSlug}`, { redirectCode: 301, replace: true })
}
const product = await getProductBySlug(canonicalSlug)
if (!product) throw createError({ statusCode: 404, statusMessage: '未找到该产品。' })

const featuredSpecifications = computed(() => product.highlights.slice(0, 5))

const config = useRuntimeConfig()
const productUrl = absoluteSiteUrl(config.public.siteUrl, `/zh/products/${product.slug}`)
const productImageUrl = product.media.heroPath ? absoluteSiteUrl(config.public.siteUrl, product.media.heroPath) : undefined
const productImageUrls = [product.media.heroPath, ...product.media.galleryPaths]
  .filter((path): path is string => Boolean(path))
  .map(path => absoluteSiteUrl(config.public.siteUrl, path))
// The published specification table is the complete fact source; hero highlights are only a short summary.
const specificationRows = productSpecificationRows(product.contentHtml)
const productProperties = specificationRows.length
  ? specificationRows
  : product.highlights.map(highlight => ({ name: highlight.label, value: highlight.value }))
const categoryPath = isCanonicalProductCategorySlug(product.categorySlug) ? productCategoryPath(product.categorySlug) : undefined
usePageSeo({ title: product.seo.title, description: product.seo.description, path: `/zh/products/${product.slug}`, image: productImageUrl })
const productStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': productUrl,
  name: product.title,
  description: product.summary,
  ...(product.model ? { sku: product.model, mpn: product.model } : {}),
  category: product.category,
  url: productUrl,
  image: productImageUrls.length ? productImageUrls : undefined,
  brand: { '@type': 'Brand', name: 'ULINKTEK' },
  manufacturer: { '@id': organizationEntityId(config.public.siteUrl) },
  additionalProperty: productProperties.length
    ? productProperties.map(property => ({ '@type': 'PropertyValue', name: property.name, value: property.value }))
    : undefined,
}
const productBreadcrumb = breadcrumbListEntity(config.public.siteUrl, `/zh/products/${product.slug}`, [
  { name: '首页', path: '/' },
  { name: '产品中心', path: '/zh/products' },
  ...(categoryPath ? [{ name: product.category, path: categoryPath }] : []),
  { name: product.title, path: `/zh/products/${product.slug}` },
])

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: serializeJsonLd(productStructuredData),
  }, {
    type: 'application/ld+json',
    innerHTML: serializeJsonLd({ '@context': 'https://schema.org', ...productBreadcrumb }),
  }],
})
</script>

<template>
  <section class="product-hero">
    <div class="page-width product-hero__grid">
      <ProductGallery
        :name="product.title"
        :cover-image-url="product.media.heroPath"
        :gallery="product.media.galleryPaths"
        :video-url="product.videoUrl"
      />
      <div class="product-hero__content">
        <NuxtLink v-if="categoryPath" class="eyebrow product-category-link" :to="categoryPath">{{ product.category }}</NuxtLink>
        <NuxtLink v-else class="eyebrow product-category-link" to="/zh/products">返回产品中心</NuxtLink>
        <h1>{{ product.title }}</h1>
        <dl v-if="featuredSpecifications.length" class="product-hero__specifications">
          <div v-for="(highlight, index) in featuredSpecifications" :key="`${highlight.label}-${index}`" class="product-hero__specification">
            <dt>{{ highlight.label }}</dt>
            <dd>{{ highlight.value }}</dd>
          </div>
        </dl>
        <NuxtLink class="button button--primary" :to="{ path: '/zh/contact', query: { product: product.model || product.title } }">获取资料或报价</NuxtLink>
      </div>
    </div>
  </section>

  <section v-if="product.contentHtml" class="section"><div class="page-width rich-content"><h2>产品介绍</h2><div v-html="product.contentHtml" /></div></section>

  <section v-if="product.applications.length" class="section section--quiet">
    <div class="page-width application-layout">
      <div>
        <p class="eyebrow">适用场景</p>
        <h2>围绕实际检查任务设计</h2>
      </div>
      <ul>
        <li v-for="application in product.applications" :key="application">{{ application }}</li>
      </ul>
    </div>
  </section>
</template>
