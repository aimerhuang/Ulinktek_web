<script setup lang="ts">
import { paginatedPath, paginatedTitle, paginationItems, parsePaginationQuery, resolvePagination } from '~/shared/content/pagination'
import { parseLegacyProductCategoryQuery, productCategoryPath } from '~/shared/content/product-category'
import { absoluteSiteUrl, breadcrumbListEntity, serializeJsonLd, websiteEntityId } from '~/shared/content/structured-data'

const { getProductPage, getProductCategories, getProductCategoryCatalog } = useContentApi()
const route = useRoute()
const hasLegacyCategory = Object.hasOwn(route.query, 'category')
if (hasLegacyCategory) {
  const legacy = parseLegacyProductCategoryQuery(route.query as Record<string, unknown>)
  if (!legacy) throw createError({ statusCode: 404, statusMessage: '未找到该产品分类。' })
  const catalog = await getProductCategoryCatalog(legacy.slug)
  if (!catalog) throw createError({ statusCode: 404, statusMessage: '未找到该产品分类。' })
  await navigateTo(paginatedPath(productCategoryPath(legacy.slug), legacy.page), { redirectCode: 301, replace: true })
}

const pageQuery = computed(() => parsePaginationQuery(route.query.page))
if (!hasLegacyCategory && (Object.keys(route.query).some(key => key !== 'page') || !pageQuery.value.canonical)) {
  await navigateTo(paginatedPath('/zh/products', pageQuery.value.page), { redirectCode: 301, replace: true })
}
const productsTitle = useNavigationLabel('/zh/products')
const currentPage = computed(() => pageQuery.value.page)
const productListingTitle = computed(() => paginatedTitle(productsTitle.value, currentPage.value))
const { data: categoriesData } = await useAsyncData('product-categories', getProductCategories)
const categories = computed(() => categoriesData.value || [])
const productsKey = computed(() => `products:all:${currentPage.value}`)
const { data: productsData } = await useAsyncData(productsKey, () => getProductPage(undefined, '', currentPage.value))
const products = computed(() => productsData.value?.items || [])
const totalPages = computed(() => Math.ceil((productsData.value?.total || 0) / (productsData.value?.pageSize || 10)))
const visiblePaginationItems = computed(() => paginationItems(totalPages.value, currentPage.value))
if (!hasLegacyCategory && resolvePagination(route.query.page, totalPages.value).action === 'not-found') {
  throw createError({ statusCode: 404, statusMessage: '未找到该产品列表页。' })
}

function productListingTo(page: number) {
  return paginatedPath('/zh/products', page)
}

const productListingDescription = '查看优联科技便携式内窥镜、立式管道内窥镜和高端管道内窥镜的产品信息、适用场景与询盘方式。'
const canonicalPath = computed(() => paginatedPath('/zh/products', currentPage.value))
usePageSeo({
  title: productListingTitle,
  description: productListingDescription,
  path: canonicalPath,
})

const config = useRuntimeConfig()
useHead(() => {
  const listingUrl = absoluteSiteUrl(config.public.siteUrl, canonicalPath.value)
  const breadcrumb = breadcrumbListEntity(config.public.siteUrl, '/zh/products', [
    { name: '首页', path: '/' },
    { name: productsTitle.value, path: '/zh/products' },
  ])
  const pageSize = productsData.value?.pageSize || products.value.length
  return {
    script: [{
      type: 'application/ld+json',
      innerHTML: serializeJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            '@id': listingUrl,
            name: productListingTitle.value,
            description: productListingDescription,
            url: listingUrl,
            isPartOf: { '@id': websiteEntityId(config.public.siteUrl) },
            breadcrumb: { '@id': breadcrumb['@id'] },
          },
          {
            '@type': 'ItemList',
            '@id': `${listingUrl}#products`,
            numberOfItems: products.value.length,
            itemListElement: products.value.map((product, index) => ({
              '@type': 'ListItem',
              position: (currentPage.value - 1) * pageSize + index + 1,
              name: product.title,
              url: absoluteSiteUrl(config.public.siteUrl, `/zh/products/${product.slug}`),
            })),
          },
          breadcrumb,
        ],
      }),
    }],
  }
})
</script>

<template>
  <section class="section section--listing product-list-section">
    <div class="page-width product-catalog">
      <aside class="product-catalog__sidebar" aria-label="产品分类">
        <NuxtLink class="product-catalog__all" to="/zh/products">{{ productsTitle }}</NuxtLink>
        <nav>
          <NuxtLink
            v-for="category in categories"
            :key="category.slug"
            :to="productCategoryPath(category.slug)"
          >{{ category.name }}</NuxtLink>
        </nav>
      </aside>
      <div class="product-catalog__results">
        <h1>{{ productListingTitle }}</h1>
        <p v-if="currentPage === 1" class="product-list-intro">优联Ulinktek管道内窥镜是检查管道或下水道堵塞情况的最佳选择。它无需挖掘或开挖沟渠即可查看管道内部情况。管道内窥镜还能辨识油脂堆积、泄漏和堵塞物。请查看管道内窥镜产品。如有任何疑问，请与我们联系。</p>
        <div v-if="products.length" class="product-catalog__grid">
          <NuxtLink v-for="product in products" :key="product.slug" class="product-catalog__item" :to="`/zh/products/${product.slug}`">
            <MediaPlaceholder :label="product.title" :alt="product.media.heroAlt" :src="product.media.heroPath" responsive="card" sizes="(max-width: 600px) calc(100vw - 30px), (max-width: 1199px) 45vw, 300px" />
            <strong>{{ product.title }}</strong>
          </NuxtLink>
        </div>
        <div v-else class="empty-state"><h2>该分类暂无产品</h2><p>请查看全部产品，或联系团队获取选型支持。</p><NuxtLink class="text-link" to="/zh/products">查看全部产品</NuxtLink></div>
        <nav v-if="totalPages > 1" class="product-pagination product-pagination--borderless" aria-label="产品分页">
          <NuxtLink
            class="product-pagination__control"
            :class="{ 'is-disabled': currentPage === 1 }"
            :to="productListingTo(Math.max(1, currentPage - 1))"
            :aria-disabled="currentPage === 1"
            :tabindex="currentPage === 1 ? -1 : undefined"
          >上一页</NuxtLink>
          <template v-for="(item, index) in visiblePaginationItems" :key="`${item}-${index}`">
            <span v-if="item === 'ellipsis'" class="product-pagination__ellipsis" aria-hidden="true">...</span>
            <NuxtLink
              v-else
              class="product-pagination__page"
              :class="{ 'is-current': item === currentPage }"
              :to="productListingTo(item)"
              :aria-current="item === currentPage ? 'page' : undefined"
            >{{ item }}</NuxtLink>
          </template>
          <NuxtLink
            class="product-pagination__control"
            :class="{ 'is-disabled': currentPage === totalPages }"
            :to="productListingTo(Math.min(totalPages, currentPage + 1))"
            :aria-disabled="currentPage === totalPages"
            :tabindex="currentPage === totalPages ? -1 : undefined"
          >下一页</NuxtLink>
        </nav>
      </div>
    </div>
  </section>
</template>
