<script setup lang="ts">
const route = useRoute()
const supportTitle = useNavigationLabel('/zh/support')
const repairTitle = useNavigationLabel('/zh/support#repair')
onMounted(() => {
  if (route.hash === '#faq') void navigateTo('/zh/faq', { replace: true })
})
watch(() => route.hash, (hash) => {
  if (hash === '#faq') void navigateTo('/zh/faq', { replace: true })
})

const { getPolicies } = useContentApi()
const warrantyPolicies = await getPolicies('warranty')

const serviceSections = [
  {
    id: 'repair',
    title: repairTitle.value,
    description: '以下内容来自已发布的保修政策，具体执行以确认的产品资料与服务协议为准。',
    emptyTitle: '保修政策正在整理',
    emptyDescription: '已审核的保修政策会在发布后显示。您可通过公开联系方式咨询具体需求。',
    policies: warrantyPolicies,
    quiet: true,
  },
]

usePageSeo({
  title: supportTitle,
  // Lead with the published policy text so the snippet states actual warranty terms.
  description: warrantyPolicies[0]
    ? `${warrantyPolicies[0].title}：${warrantyPolicies[0].content}`
    : '查看优联科技已发布的保修政策。',
  path: '/zh/support',
})
</script>

<template>
  <h1 class="visually-hidden">{{ supportTitle }}</h1>
  <section
    v-for="service in serviceSections"
    :id="service.id"
    :key="service.id"
    class="section"
    :class="{ 'section--quiet': service.quiet }"
    :aria-labelledby="`${service.id}-title`"
  >
    <div class="page-width">
      <div class="section-heading">
        <h2 :id="`${service.id}-title`">{{ service.title }}</h2>
        <p>{{ service.description }}</p>
      </div>
      <div v-if="service.policies.length" class="policy-list">
        <article v-for="policy in service.policies" :key="policy.id" class="policy-item" :class="{ 'policy-item--text-only': !policy.imageUrl }">
          <MediaPlaceholder v-if="policy.imageUrl" kind="scene" :label="policy.title" :alt="policy.title" :src="policy.imageUrl" />
          <div class="policy-item__content">
            <h3>{{ policy.title }}</h3>
            <div v-if="policy.contentHtml" class="rich-content" v-html="policy.contentHtml" />
            <p v-else>{{ policy.content }}</p>
            <NuxtLink class="text-link" to="/zh/contact">联系服务团队</NuxtLink>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <h3>{{ service.emptyTitle }}</h3>
        <p>{{ service.emptyDescription }}</p>
        <NuxtLink class="text-link" to="/zh/contact">联系服务团队</NuxtLink>
      </div>
    </div>
  </section>
</template>
