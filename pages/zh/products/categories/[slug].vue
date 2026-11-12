<script setup lang="ts">
import { paginatedTitle, paginationItems, parsePaginationQuery, resolvePagination } from '~/shared/content/pagination'
import { isCanonicalProductCategorySlug, productCategoryPagePath, productCategoryPath } from '~/shared/content/product-category'
import { breadcrumbListEntity, serializeJsonLd, websiteEntityId } from '~/shared/content/structured-data'

const route = useRoute()
const { getProductCategoryCatalog, getProductCategoryLanding } = useContentApi()
const requestedSlug = String(route.params.slug)
if (!isCanonicalProductCategorySlug(requestedSlug)) {
  throw createError({ statusCode: 404, statusMessage: '未找到该产品分类。' })
}

const catalog = await getProductCategoryCatalog(requestedSlug)
if (!catalog) throw createError({ statusCode: 404, statusMessage: '未找到该产品分类。' })

const pageQuery = computed(() => parsePaginationQuery(route.query.page))
if (Object.keys(route.query).some(key => key !== 'page') || !pageQuery.value.canonical) {
  await navigateTo(productCategoryPagePath(catalog.category.slug, pageQuery.value.page), { redirectCode: 301, replace: true })
}

const pageSize = 9
const totalPages = Math.ceil(catalog.products.length / pageSize)
if (resolvePagination(route.query.page, totalPages).action === 'not-found') {
  throw createError({ statusCode: 404, statusMessage: '未找到该产品分类页。' })
}

const landing = pageQuery.value.page === 1
  ? await getProductCategoryLanding(catalog.category.slug)
  : undefined
if (pageQuery.value.page === 1 && !landing) {
  throw createError({ statusCode: 404, statusMessage: '未找到该产品分类。' })
}

const currentPage = computed(() => pageQuery.value.page)
const products = computed(() => catalog.products.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))
const categories = catalog.categories
const productsTitle = useNavigationLabel('/zh/products')
usePageBreadcrumbLabel(() => route.path, () => catalog.category.name)
const pageTitle = computed(() => paginatedTitle(catalog.category.name, currentPage.value))
const canonicalPath = computed(() => productCategoryPagePath(catalog.category.slug, currentPage.value))
// The published category intro is the real page summary; the template only covers categories without one.
const description = landing?.intro?.trim() || `${catalog.category.name}分类下已发布产品的信息、适用场景与询盘入口。`
const emptyCategory = catalog.products.length === 0
const visiblePaginationItems = computed(() => paginationItems(totalPages, currentPage.value))

usePageSeo({
  title: pageTitle,
  description,
  path: canonicalPath,
  image: catalog.products.find(product => product.media.heroPath)?.media.heroPath,
  robots: emptyCategory ? 'noindex, follow' : undefined,
})

const config = useRuntimeConfig()
const breadcrumb = breadcrumbListEntity(config.public.siteUrl, productCategoryPath(catalog.category.slug), [
  { name: '首页', path: '/' },
  { name: productsTitle.value, path: '/zh/products' },
  { name: catalog.category.name, path: productCategoryPath(catalog.category.slug) },
])
const structuredData = computed(() => {
  const categoryUrl = new URL(canonicalPath.value, `${config.public.siteUrl}/`).toString()
  return {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': categoryUrl,
      name: catalog.category.name,
      description,
      url: categoryUrl,
      isPartOf: { '@id': websiteEntityId(config.public.siteUrl) },
      breadcrumb: { '@id': breadcrumb['@id'] },
    },
    {
      '@type': 'ItemList',
      '@id': `${categoryUrl}#products`,
      numberOfItems: products.value.length,
      itemListElement: products.value.map((product, index) => ({
        '@type': 'ListItem',
        position: (currentPage.value - 1) * pageSize + index + 1,
        name: product.title,
        url: new URL(`/zh/products/${product.slug}`, `${config.public.siteUrl}/`).toString(),
      })),
    },
    breadcrumb,
    ...(landing?.faqs.length ? [{
      '@type': 'FAQPage',
      '@id': `${categoryUrl}#faq`,
      mainEntity: landing.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answerText,
        },
      })),
    }] : []),
  ],
  }
})
useHead(() => ({ script: [{ type: 'application/ld+json', innerHTML: serializeJsonLd(structuredData.value) }] }))
</script>

<template>
  <section class="section section--listing product-list-section">
    <div class="page-width product-catalog product-catalog--category">
      <aside class="product-catalog__sidebar" aria-label="产品分类">
        <NuxtLink class="product-catalog__all" to="/zh/products">{{ productsTitle }}</NuxtLink>
        <nav>
          <NuxtLink
            v-for="category in categories"
            :key="category.slug"
            :to="productCategoryPath(category.slug)"
            :class="{ 'is-active': category.slug === catalog.category.slug }"
            :aria-current="category.slug === catalog.category.slug ? 'page' : undefined"
          >{{ category.name }}</NuxtLink>
        </nav>
      </aside>
      <div class="product-catalog__results">
        <h1>{{ catalog.category.name }}</h1>
        <ProductCategoryIntro v-if="currentPage === 1 && landing?.intro" :intro="landing.intro" />
        <div v-if="products.length" class="product-catalog__grid">
          <NuxtLink v-for="product in products" :key="product.slug" class="product-catalog__item" :to="`/zh/products/${product.slug}`">
            <MediaPlaceholder :label="product.title" :alt="product.media.heroAlt" :src="product.media.heroPath" responsive="card" sizes="(max-width: 600px) calc(100vw - 30px), (max-width: 1199px) 45vw, 300px" />
            <strong>{{ product.title }}</strong>
          </NuxtLink>
        </div>
        <div v-else class="empty-state">
          <h2>该分类暂无产品</h2>
          <p>请查看全部产品，或联系团队获取选型支持。</p>
          <NuxtLink class="text-link" to="/zh/products">查看全部产品</NuxtLink>
        </div>
        <ProductCategorySelectionTable v-if="currentPage === 1 && landing?.selectionTable" :table="landing.selectionTable" />
        <ProductCategoryFaq v-if="currentPage === 1 && landing?.faqs.length" :faqs="landing.faqs" />
        <nav v-if="totalPages > 1" class="product-pagination product-pagination--borderless" aria-label="产品分页">
          <NuxtLink
            class="product-pagination__control"
            :class="{ 'is-disabled': currentPage === 1 }"
            :to="productCategoryPagePath(catalog.category.slug, Math.max(1, currentPage - 1))"
            :aria-disabled="currentPage === 1"
            :tabindex="currentPage === 1 ? -1 : undefined"
          >上一页</NuxtLink>
          <template v-for="(item, index) in visiblePaginationItems" :key="`${item}-${index}`">
            <span v-if="item === 'ellipsis'" class="product-pagination__ellipsis" aria-hidden="true">...</span>
            <NuxtLink
              v-else
              class="product-pagination__page"
              :class="{ 'is-current': item === currentPage }"
              :to="productCategoryPagePath(catalog.category.slug, item)"
              :aria-current="item === currentPage ? 'page' : undefined"
            >{{ item }}</NuxtLink>
          </template>
          <NuxtLink
            class="product-pagination__control"
            :class="{ 'is-disabled': currentPage === totalPages }"
            :to="productCategoryPagePath(catalog.category.slug, Math.min(totalPages, currentPage + 1))"
            :aria-disabled="currentPage === totalPages"
            :tabindex="currentPage === totalPages ? -1 : undefined"
          >下一页</NuxtLink>
        </nav>
      </div>
    </div>
  </section>
</template>
