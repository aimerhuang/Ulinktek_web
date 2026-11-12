<script setup lang="ts">
import type { DisplayContactInfo, SiteSettings } from '~/composables/useContentApi'
import type { SiteNavigationItem } from '~/shared/content/navigation'
import { footerRecordHref, type FooterRecordType } from '~/shared/content/footer-records'

const props = defineProps<{
  navigation: SiteNavigationItem[]
  contact: DisplayContactInfo
  settings: SiteSettings
}>()

const footerEntries = computed(() => {
  const entries: Array<{
    type: FooterRecordType
    label: string
    text?: string
    imageUrl?: string
  }> = [
    { type: 'icp', label: 'ICP备案', text: props.settings.icpNumber, imageUrl: props.settings.icpImageUrl },
    { type: 'publicSecurity', label: '网安备案', text: props.settings.publicSecurityNumber, imageUrl: props.settings.publicSecurityImageUrl },
    { type: 'copyright', label: '版权信息', text: props.settings.copyright, imageUrl: props.settings.copyrightImageUrl },
  ]
  return entries.flatMap((entry) => {
    const text = entry.text?.trim()
    if (!text && !entry.imageUrl) return []
    return [{ ...entry, text, href: text ? footerRecordHref(entry.type, text) : undefined }]
  })
})
</script>

<template>
  <footer class="site-footer">
    <div class="page-width footer-grid">
      <div>
        <p class="footer-title">主菜单</p>
        <SiteNavigationLink v-for="item in navigation" :key="item.id" :item="item" />
      </div>
      <div>
        <p class="footer-title">联系方式</p>
        <p>电话：<a :href="`tel:${contact.phone}`">{{ contact.phone }}</a></p>
        <p v-for="item in contact.emails" :key="item.address">{{ item.label || '邮箱' }}：<a :href="`mailto:${item.address}`">{{ item.address }}</a></p>
        <p>地址：{{ contact.address }}</p>
      </div>
      <div>
        <p class="footer-title">网站说明</p>
        <NuxtLink to="/zh/terms">用户协议</NuxtLink>
        <NuxtLink to="/zh/privacy">隐私政策</NuxtLink>
      </div>
    </div>
    <div v-if="footerEntries.length" class="page-width footer-bottom">
      <div v-for="entry in footerEntries" :key="entry.type" class="footer-record">
        <img v-if="entry.imageUrl" class="footer-record__image" :src="entry.imageUrl" :alt="`${entry.label}图片`">
        <a v-if="entry.text && entry.href" :href="entry.href" target="_blank" rel="noopener noreferrer">{{ entry.text }}</a>
        <span v-else-if="entry.text">{{ entry.text }}</span>
      </div>
    </div>
  </footer>
</template>
