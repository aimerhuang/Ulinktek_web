<script setup lang="ts">
import type { ContactInfo } from '~/composables/useContentApi'

defineProps<{ contact: ContactInfo }>()
</script>

<template>
  <aside class="contact-toolbar" aria-label="快捷联系">
    <NuxtLink to="/zh/contact">在线咨询</NuxtLink>
    <a :href="`tel:${contact.phone}`">电话咨询</a>
    <a :href="`mailto:${contact.email}`">邮件联系</a>
    <a href="#top">返回顶部</a>
  </aside>
</template>
