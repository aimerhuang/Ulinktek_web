<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import type { Product } from '~/shared/content/products'
import { absoluteSiteUrl, breadcrumbListEntity, organizationEntityId, serializeJsonLd } from '~/shared/content/structured-data'

// Editable draft copy is intentionally grouped here. Replace business wording only after factual review.
const pageCopy = {
  title: '管道检测设备 OEM/ODM 定制',
  breadcrumb: 'OEM/ODM 定制',
  description: '面向品牌商与渠道商的管道检测设备 OEM/ODM 定制服务，从产品定义、样机验证到批量交付，按需求评估摄像头、控制终端、线盘、品牌与包装方案。',
  companyIntro: '优联是一家专业的制造商，致力于设计、研究、生产、供应和销售高质量的图像和摄像检测系统。我们的产品旨在满足各种检测需求。我们的设备操作简单，能够提供高清晰度的图像，使得专业人士能够轻松进行全面的检测工作。我们与合作伙伴紧密合作，定制符合其规格和品牌需求的产品。从初步设计到最终生产，我们的团队始终致力于提供量身定制的解决方案，以优化您的运营并拓展市场。我们专注于生产推杆式摄像机、下水道和排水管检测系统以及水下检测摄像机。',
  comparisonNote: '最终 OEM/ODM 配置、样机安排和商业条件以双方确认的书面方案为准。',
}

const heroStages = [
  { number: '01', title: '定义产品', detail: '明确目标市场、应用工况、产品定位和品牌呈现。' },
  { number: '02', title: '验证样机', detail: '围绕结构、功能、界面和包装逐项确认样机要求。' },
  { number: '03', title: '批量交付', detail: '在确认版本与验收边界后，进入后续批量合作。' },
]

const comparisonParameters = [
  { code: 'product-type', label: '产品类型' },
  { code: 'applicable-pipe', label: '适用管径' },
  { code: 'inspection-distance', label: '检测距离' },
  { code: 'camera-size', label: '镜头尺寸' },
  { code: 'resolution', label: '分辨率' },
  { code: 'waterproof-rating', label: '防水等级' },
] as const

const engagementModes = [
  {
    label: 'OEM',
    title: '基于成熟平台建立您的品牌版本',
    body: '适合已有明确市场定位，希望从现有设备平台出发，调整品牌标识、外观、配置组合、包装与资料的合作方式。',
    points: ['缩短产品定义路径', '重点确认配置与品牌交付物', '以样机版本作为后续确认基线'],
  },
  {
    label: 'ODM',
    title: '围绕目标场景共同定义产品方案',
    body: '适合现有平台无法直接覆盖，或需要进一步讨论结构、功能和交互方式的产品规划。',
    points: ['从用户、工况和产品定位开始', '增加技术评估与方案确认环节', '开发范围和权责以项目文件为准'],
  },
]

const faqs = [
  {
    question: '可以只做品牌标识和包装定制吗？',
    answer: '可以先提交品牌标识、外观、包装和资料需求。团队会结合所选设备平台确认适用范围，并以最终书面方案为准。',
  },
  {
    question: '摄像头、控制终端和线盘可以自由组合吗？',
    answer: '您可以按目标工况提出组合需求，但部件之间涉及结构、电气、通信和作业适配，不应默认任意组合。我们会在方案评估阶段说明可行组合与需要验证的项目。',
  },
  {
    question: 'OEM 与 ODM 应该如何选择？',
    answer: '如果成熟平台已能覆盖主要需求，通常可从 OEM 的配置和品牌定制开始；如果需要重新定义结构、功能或交互方式，则需要按 ODM 项目进一步评估。',
  },
  {
    question: '是否可以先做样机再决定批量合作？',
    answer: '页面采用“定义产品—验证样机—批量交付”的合作路径。具体样机方式、确认项目和商业条件需要根据方案另行约定。',
  },
  {
    question: '起订量和交付周期是多少？',
    answer: '起订量与周期会受到设备平台、定制深度、物料和验证范围影响。请提交目标配置与计划，由团队完成评估后回复。',
  },
  {
    question: '询盘时需要准备哪些资料？',
    answer: '建议提供目标市场、应用工况、功能清单、品牌规范、包装资料和预计合作计划。信息越完整，越有利于快速识别需要确认的技术边界。',
  },
]

const { getHomepageProducts, getProductBySlug } = useContentApi()
const comparisonSeeds = (await getHomepageProducts())
  .filter(product => product.productKind === 'finished_product')
  .slice(0, 4)
const comparisonProducts = (await Promise.all(comparisonSeeds.map(product => getProductBySlug(product.slug))))
  .filter((product): product is Product => Boolean(product))

function comparisonProductName(product: Product) {
  if (!product.model) return product.title
  return product.title.replace(product.model, '').trim() || product.category
}

function comparisonParameterValue(product: Product, code: typeof comparisonParameters[number]['code']) {
  if (code === 'product-type') return product.categorySlug ? product.category : undefined
  return product.specifications[code]
}

const pagePath = '/zh/oem-odm'
const config = useRuntimeConfig()
const canonicalUrl = absoluteSiteUrl(config.public.siteUrl, pagePath)

usePageBreadcrumbLabel(pagePath, pageCopy.breadcrumb)
usePageSeo({
  title: pageCopy.title,
  description: pageCopy.description,
  path: pagePath,
})

const serviceEntity = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${canonicalUrl}#service`,
  name: pageCopy.title,
  description: pageCopy.description,
  serviceType: '管道检测设备 OEM/ODM 定制服务',
  url: canonicalUrl,
  provider: { '@id': organizationEntityId(config.public.siteUrl) },
  audience: { '@type': 'BusinessAudience', audienceType: '品牌商与渠道商' },
}
const faqEntity = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${canonicalUrl}#faq`,
  mainEntity: faqs.map(item => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}
const breadcrumbEntity = {
  '@context': 'https://schema.org',
  ...breadcrumbListEntity(config.public.siteUrl, pagePath, [
    { name: '首页', path: '/' },
    { name: pageCopy.breadcrumb, path: pagePath },
  ]),
}

useHead({
  script: [
    { key: 'oem-service-jsonld', type: 'application/ld+json', innerHTML: serializeJsonLd(serviceEntity) },
    { key: 'oem-faq-jsonld', type: 'application/ld+json', innerHTML: serializeJsonLd(faqEntity) },
    { key: 'oem-breadcrumb-jsonld', type: 'application/ld+json', innerHTML: serializeJsonLd(breadcrumbEntity) },
  ],
})
</script>

<template>
  <div class="oem-page">
    <!--
    THESIS: OEM/ODM is a three-stage auditable path, not a generic feature catalog.
    OWN-WORLD: White and quiet-gray industrial surfaces, charcoal rules, square controls, brick-red stage signals.
    STORY: A brand defines its product, validates one sample baseline, then moves into batch cooperation.
    FIRST VIEWPORT: Left 42% holds one proposition and inquiry CTA; right 58% is a large 01–03 workflow board crossed by an equipment schematic.
    FORM: Three-stage collaboration path, grounded candidate 4, seed 77466f90.
    FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
    -->
    <section class="oem-hero" aria-labelledby="oem-page-title">
      <div class="page-width oem-hero__grid">
        <header class="oem-hero__content">
          <h1 id="oem-page-title" class="visually-hidden">{{ pageCopy.title }}</h1>
          <p class="oem-hero__intro">{{ pageCopy.companyIntro }}</p>
          <div class="oem-hero__actions">
            <a class="button button--primary oem-hero__primary" href="#oem-inquiry">提交定制需求</a>
            <a class="oem-inline-link" href="#product-comparison">
              查看产品对比
              <ArrowRight :size="20" aria-hidden="true" />
            </a>
          </div>
        </header>

        <div class="oem-stage-board" aria-labelledby="oem-stage-title">
          <div class="oem-stage-board__heading">
            <h2 id="oem-stage-title">从需求到批量合作</h2>
            <span>定制流程结构示意</span>
          </div>
          <ol class="oem-stage-list">
            <li v-for="stage in heroStages" :key="stage.number">
              <span class="oem-stage-list__number">{{ stage.number }}</span>
              <div>
                <h3>{{ stage.title }}</h3>
                <p>{{ stage.detail }}</p>
              </div>
            </li>
          </ol>
          <figure class="oem-stage-board__figure">
            <img
              src="/images/oem-odm-process-schematic.webp"
              width="1008"
              height="1104"
              alt="摄像头、控制终端、推杆线盘与运输箱组成的定制流程结构示意"
              fetchpriority="high"
            >
            <ul class="oem-stage-board__callouts" aria-label="流程确认重点">
              <li>界面与功能定义</li>
              <li>结构与集成验证</li>
              <li>品牌化与包装确认</li>
            </ul>
            <figcaption>结构示意不代表最终产品配置</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section id="product-comparison" class="section oem-product-comparison" aria-labelledby="oem-comparison-title">
      <div class="page-width">
        <header class="oem-section-heading">
          <h2 id="oem-comparison-title">参数对比</h2>
        </header>

        <template v-if="comparisonProducts.length">
          <p id="oem-comparison-scroll-hint" class="oem-comparison__scroll-hint">左右滑动查看全部型号</p>
          <div
            class="oem-comparison__table-region"
            role="region"
            aria-labelledby="oem-comparison-title"
            aria-describedby="oem-comparison-scroll-hint oem-comparison-note"
            tabindex="0"
          >
            <table>
              <caption class="visually-hidden">优联科技已发布产品参数横向对比</caption>
              <thead>
                <tr>
                  <th scope="col">对比参数</th>
                  <th v-for="product in comparisonProducts" :key="product.slug" scope="col">
                    <NuxtLink
                      class="oem-comparison__product"
                      :to="`/zh/products/${product.slug}`"
                      :aria-label="`查看 ${product.title} 产品详情`"
                    >
                      <strong>{{ product.model || product.title }}</strong>
                      <span>{{ comparisonProductName(product) }}</span>
                    </NuxtLink>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="parameter in comparisonParameters" :key="parameter.code">
                  <th scope="row">{{ parameter.label }}</th>
                  <td
                    v-for="product in comparisonProducts"
                    :key="product.slug"
                    :class="{ 'is-missing': !comparisonParameterValue(product, parameter.code) }"
                  >
                    {{ comparisonParameterValue(product, parameter.code) || '暂未发布' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p id="oem-comparison-note" class="oem-comparison__note">{{ pageCopy.comparisonNote }}</p>
        </template>
        <div v-else class="empty-state oem-comparison__empty">
          <h3>暂无可对比的已发布产品</h3>
          <p>请前往产品中心查看当前公开资料。</p>
          <NuxtLink class="text-link" to="/zh/products">查看产品中心</NuxtLink>
        </div>
      </div>
    </section>

    <section class="section oem-engagement" aria-labelledby="oem-engagement-title">
      <div class="page-width">
        <header class="oem-section-heading">
          <h2 id="oem-engagement-title">选择适合当前阶段的合作方式</h2>
        </header>
        <div class="oem-engagement__grid">
          <article v-for="mode in engagementModes" :key="mode.label">
            <span>{{ mode.label }}</span>
            <h3>{{ mode.title }}</h3>
            <p>{{ mode.body }}</p>
            <ul>
              <li v-for="point in mode.points" :key="point">{{ point }}</li>
            </ul>
          </article>
        </div>
      </div>
    </section>

    <section class="section oem-faq" aria-labelledby="oem-faq-title">
      <div class="page-width oem-faq__layout">
        <header class="oem-section-heading">
          <h2 id="oem-faq-title">定制合作常见问题</h2>
          <p>商业条件与技术边界会随项目变化，以下回答用于帮助您准备第一次沟通。</p>
        </header>
        <div class="oem-faq__list">
          <details v-for="(faq, index) in faqs" :key="faq.question" :open="index === 0">
            <summary>{{ faq.question }}</summary>
            <p>{{ faq.answer }}</p>
          </details>
        </div>
      </div>
    </section>

    <section id="oem-inquiry" class="section oem-inquiry" aria-labelledby="oem-inquiry-title" tabindex="-1">
      <div class="page-width oem-inquiry__grid">
        <header>
          <h2 id="oem-inquiry-title">从您的产品计划开始</h2>
          <p>请说明目标市场、应用工况、关注配置和品牌要求。我们会先核对信息，再讨论下一步需要评估的内容。</p>
          <p class="oem-inquiry__note">暂时没有完整规格书也可以提交，现有产品照片、功能清单或品牌规范都能帮助我们理解需求。</p>
        </header>
        <InquiryForm product-model="OEM/ODM 定制项目" />
      </div>
    </section>
  </div>
</template>
