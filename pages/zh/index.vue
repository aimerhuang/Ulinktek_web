<script setup lang="ts">
import { RefreshCw } from 'lucide-vue-next'
import { forumErrorMessage } from '~/composables/useForumApi'
import { articlePublicSlug, knowledgeArticlePath, knowledgeCategoryPath, KNOWLEDGE_BASE_PATH } from '~/shared/content/knowledge'
import { visibleKnowledgeCategories } from '~/shared/content/knowledge-categories'
import { findNavigationLabelByPath, type SiteNavigationItem } from '~/shared/content/navigation'
import { productsInProductCategory } from '~/shared/content/product-categories'
import { productCategoryPath } from '~/shared/content/product-category'
import type { Product } from '~/shared/content/products'
import type { SiteSettings } from '~/composables/useContentApi'
import type { ForumPost } from '~/shared/forum/contracts'
import { formatForumDate } from '~/shared/forum/presentation'
import { truncatePublicationText } from '~/shared/content/product-publication'

definePageMeta({ alias: ['/'] })

const route = useRoute()
if (route.path === '/zh' || route.path === '/zh/') {
  await navigateTo('/', { redirectCode: 301, replace: true })
}

const { getProducts, getMediaPage, getHomeBanners, getHomepageProducts, getProductCategories, getAbout, getKnowledgeCategories } = useContentApi()
const [products, featuredProducts, mediaPage, banners, categories, profile, knowledgeCategories] = await Promise.all([
  getProducts(),
  getHomepageProducts(),
  getMediaPage(undefined, 1, 4),
  getHomeBanners(),
  getProductCategories(),
  getAbout(),
  getKnowledgeCategories(),
])
const productList = Array.isArray(products) ? products : []
const featuredMedia = computed(() => mediaPage.items)
const knowledgeCategoryLinks = visibleKnowledgeCategories(knowledgeCategories)
const homepageTitle = '工业管道内窥镜_管道检测爬行机器人_内窥镜厂家 | 优联科技（深圳）'
const brandPreview = truncatePublicationText(profile.brandIntro || '', 240)
const activeCategorySlug = ref<string>()
const productCategories = computed(() => {
  const productsByCategory = new Map<string, Product[]>()
  for (const product of productList) {
    const categoryProducts = productsByCategory.get(product.categorySlug)
    if (categoryProducts) categoryProducts.push(product)
    else productsByCategory.set(product.categorySlug, [product])
  }

  const orderedCategories = categories.flatMap((category) => {
    const categoryProducts = productsInProductCategory(productList, category)
    if (!categoryProducts?.length) return []
    for (const memberSlug of [category.slug, ...category.descendantSlugs]) productsByCategory.delete(memberSlug)
    return [{ ...category, products: categoryProducts }]
  })

  return orderedCategories
})
const activeCategory = computed(() => productCategories.value.find((category) => category.slug === activeCategorySlug.value) || productCategories.value[0])
const activeProducts = computed(() => activeCategory.value?.products || [])
const siteNavigation = useState<SiteNavigationItem[] | undefined>('site-navigation')
const knowledgeTitle = findNavigationLabelByPath(siteNavigation.value || [], KNOWLEDGE_BASE_PATH) || '管道检测知识库'
const forumTitle = findNavigationLabelByPath(siteNavigation.value || [], '/zh/forum') || '技术论坛'
const forumApi = useForumApi()
const latestForumPosts = ref<ForumPost[]>([])
const forumLoading = ref(true)
const forumLoadError = ref('')

async function loadLatestForumPosts() {
  forumLoading.value = true
  forumLoadError.value = ''
  try {
    const result = await forumApi.listPosts(1, 3)
    latestForumPosts.value = result.items
  } catch (error) {
    latestForumPosts.value = []
    forumLoadError.value = forumErrorMessage(error, '最新帖子暂时无法加载，请稍后重试。')
  } finally {
    forumLoading.value = false
  }
}

onMounted(() => {
  void loadLatestForumPosts()
})

const siteSettings = useState<SiteSettings | undefined>('site-settings')
usePageSeo({
  title: homepageTitle,
  absoluteTitle: true,
  description: '优联科技（深圳）中国官网，专注于工业管道内窥镜、下水道检测摄像机、管道检测爬行机器人、管道定位器及通风管道检测设备的研发、制造与销售。',
  // The site-default keywords describe the company as a whole, so only the homepage carries them.
  keywords: computed(() => siteSettings.value?.defaultSeoKeywords),
  path: '/',
  image: computed(() => banners[0]?.imageUrl),
})

</script>

<template>
  <div id="top" />
  <h1 class="visually-hidden">优联科技：工业管道内窥镜、下水道检测摄像机与管道检测爬行机器人制造商</h1>
  <HomeBannerCarousel v-if="banners.length" :banners="banners" />
  <section v-else class="home-banner"><MediaPlaceholder kind="scene" label="管道检测与巡检设备" alt="优联科技管道检测设备" loading="eager" /></section>
  <div v-if="featuredProducts.length" class="search-strip"><div class="page-width"><strong>热门产品：</strong><NuxtLink v-for="product in featuredProducts" :key="product.slug" :to="`/zh/products/${product.slug}`">{{ product.title }}</NuxtLink></div></div>

  <section class="home-section home-products">
    <div class="page-width home-products__layout product-catalog">
      <aside class="product-catalog__sidebar" aria-label="产品分类">
        <NuxtLink class="product-catalog__all" to="/zh/products">产品中心</NuxtLink>
        <nav>
          <NuxtLink
            v-for="category in productCategories"
            :key="category.slug"
            :to="productCategoryPath(category.slug)"
            :class="{ 'is-active': activeCategory?.slug === category.slug }"
            :aria-current="activeCategory?.slug === category.slug ? 'true' : undefined"
            @mouseenter="activeCategorySlug = category.slug"
            @focus="activeCategorySlug = category.slug"
          >{{ category.name }}</NuxtLink>
        </nav>
      </aside>
      <div class="product-showcase product-catalog__results">
        <div class="module-title module-title--catalog"><h2>{{ activeCategory?.name || '产品中心' }}</h2><NuxtLink :to="activeCategory ? productCategoryPath(activeCategory.slug) : '/zh/products'">查看该分类</NuxtLink></div>
        <div class="product-showcase__grid">
          <NuxtLink v-for="product in activeProducts" :key="product.slug" class="product-showcase__item" :to="`/zh/products/${product.slug}`">
            <MediaPlaceholder :label="product.title" :alt="product.media.heroAlt" :src="product.media.heroPath" responsive="card" sizes="(max-width: 600px) calc(100vw - 30px), (max-width: 1199px) 45vw, 300px" />
            <strong>{{ product.title }}</strong>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>

  <section id="application-scenes" class="home-section home-scenarios">
    <div class="page-width">
      <div class="module-title module-title--flush">
        <h2>{{ knowledgeTitle }}</h2>
        <NuxtLink :to="KNOWLEDGE_BASE_PATH">查看全部</NuxtLink>
      </div>
      <ul v-if="knowledgeCategoryLinks.length" class="home-knowledge-categories" :aria-label="`${knowledgeTitle}分类`">
        <li v-for="category in knowledgeCategoryLinks" :key="category.slug">
          <NuxtLink :to="knowledgeCategoryPath(category.slug)">{{ category.name }}</NuxtLink>
        </li>
      </ul>
      <div v-if="featuredMedia.length" class="home-media-grid">
        <article v-for="article in featuredMedia" :key="article.slug" class="home-media-item">
          <NuxtLink :to="knowledgeArticlePath(articlePublicSlug(article))" :aria-label="`查看文章：${article.title}`">
            <h3>{{ article.title }}</h3>
            <p v-if="article.excerpt">{{ article.excerpt }}</p>
          </NuxtLink>
        </article>
      </div>
      <div v-else class="home-content-state">
        <p>已审核的应用内容会在发布后显示于此。</p>
      </div>
    </div>
  </section>

  <section id="latest-community" class="home-section home-information">
    <div class="page-width information-layout">
      <div class="information-community">
        <div class="module-title module-title--flush">
          <h2>{{ forumTitle }}</h2>
          <NuxtLink to="/zh/forum">查看全部</NuxtLink>
        </div>
        <div v-if="forumLoading" class="home-community-loading" role="status" aria-live="polite">
          <div v-for="item in 3" :key="item" class="home-community-loading__row" aria-hidden="true">
            <span />
            <span />
          </div>
          <span class="visually-hidden">正在加载最新帖子</span>
        </div>
        <div v-else-if="forumLoadError" class="home-community-state" role="alert">
          <p>{{ forumLoadError }}</p>
          <button type="button" @click="loadLatestForumPosts">
            <RefreshCw :size="16" aria-hidden="true" />
            重新加载
          </button>
        </div>
        <div v-else-if="latestForumPosts.length" class="home-community-list">
          <article v-for="post in latestForumPosts" :key="post.id" class="home-community-item">
            <NuxtLink :to="`/zh/forum/${post.id}`">{{ post.title }}</NuxtLink>
            <div class="home-community-item__meta">
              <span>{{ post.category.name }}</span>
              <span>{{ post.displayName }}</span>
              <time :datetime="post.publishedAt">{{ formatForumDate(post.publishedAt) }}</time>
              <span>{{ post.commentCount }} 条评论</span>
            </div>
          </article>
        </div>
        <div v-else class="home-community-state">
          <p>已审核的公开讨论会在发布后显示于此。</p>
        </div>
      </div>
      <div class="information-contact"><h2>需要产品资料或报价？</h2><p>通过型号页或联系页面提交需求，我们将根据产品与来源页面进行跟进。</p><NuxtLink class="button button--primary" to="/zh/contact">联系我们</NuxtLink></div>
    </div>
  </section>

  <section id="about-us" class="home-section home-about">
    <div class="page-width home-about__layout" :class="{ 'home-about__layout--text-only': !profile.brandPreviewImageUrl }">
      <NuxtLink
        v-if="profile.brandPreviewImageUrl"
        class="home-about__media-link"
        to="/zh/about"
        :aria-label="`了解${profile.brandTitle || '关于我们'}`"
      >
        <MediaPlaceholder
          kind="scene"
          :label="profile.brandTitle || '工厂与团队'"
          :alt="profile.brandTitle || '优联科技工厂与团队'"
          :src="profile.brandPreviewImageUrl"
        />
      </NuxtLink>
      <NuxtLink class="home-about__content-link" to="/zh/about">
        <h2>{{ profile.brandTitle || '关于我们' }}</h2>
        <p v-if="brandPreview" class="home-about__summary">{{ brandPreview }}</p>
        <p v-else class="home-about__empty">公司介绍将在完成审核后发布。</p>
        <span class="home-about__more">查看详情</span>
      </NuxtLink>
    </div>
  </section>
</template>

