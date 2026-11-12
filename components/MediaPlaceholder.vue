<script setup lang="ts">
import {
  IMAGE_CARD_WIDTHS,
  IMAGE_DETAIL_WIDTHS,
  trustedImageSrcset,
  trustedImageVariant,
} from '~/shared/content/image-variants'

const props = withDefaults(defineProps<{
  label: string
  alt: string
  kind?: 'product' | 'scene'
  src?: string
  loading?: 'eager' | 'lazy'
  responsive?: 'card' | 'detail'
  sizes?: string
}>(), { loading: 'lazy' })
const siteUrl = useRuntimeConfig().public.siteUrl
const hasImageError = ref(false)
const responsiveWidths = computed(() => props.responsive === 'card'
  ? IMAGE_CARD_WIDTHS
  : props.responsive === 'detail' ? IMAGE_DETAIL_WIDTHS : undefined)
const imageSrc = computed(() => {
  if (!props.src || !responsiveWidths.value) return props.src
  return trustedImageVariant(props.src, responsiveWidths.value.at(-1)!, siteUrl) || props.src
})
const imageSrcset = computed(() => props.src && responsiveWidths.value
  ? trustedImageSrcset(props.src, responsiveWidths.value, siteUrl)
  : undefined)

watch(() => props.src, () => { hasImageError.value = false })
</script>

<template>
  <figure v-if="src && !hasImageError" class="media-frame media-image" :class="`media-image--${kind || 'product'}`">
    <img
      :src="imageSrc"
      :srcset="imageSrcset"
      :sizes="imageSrcset ? sizes : undefined"
      :alt="alt"
      :loading="loading"
      decoding="async"
      :fetchpriority="loading === 'eager' ? 'high' : 'auto'"
      @error="hasImageError = true"
    >
  </figure>
  <figure v-else class="media-frame media-placeholder" :class="`media-placeholder--${kind || 'product'}`" role="img" :aria-label="alt">
    <div class="media-placeholder__frame">
      <span class="media-placeholder__line" />
      <span class="media-placeholder__dot" />
      <strong>{{ label }}</strong>
      <small>暂无可用图片</small>
    </div>
  </figure>
</template>
