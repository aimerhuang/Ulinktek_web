<script setup lang="ts">
import { trustedImageVariant } from '~/shared/content/image-variants'

const props = defineProps<{
  name: string
  coverImageUrl?: string
  gallery: string[]
  videoUrl?: string
}>()

const siteUrl = useRuntimeConfig().public.siteUrl
const images = computed(() => [...new Set([props.coverImageUrl, ...props.gallery].filter((url): url is string => Boolean(url)))])
const activeImage = ref(images.value[0])
const activeMedia = ref<'images' | 'video'>('images')
const failedImages = ref(new Set<string>())
const videoPoster = computed(() => props.coverImageUrl
  ? trustedImageVariant(props.coverImageUrl, 1440, siteUrl) || props.coverImageUrl
  : undefined)
const isDirectVideo = computed(() => {
  if (!props.videoUrl) return false
  try {
    return /\.(mp4|webm|ogg)$/i.test(new URL(props.videoUrl).pathname)
  } catch {
    return false
  }
})

watch(images, (nextImages) => {
  if (!activeImage.value || !nextImages.includes(activeImage.value)) activeImage.value = nextImages[0]
  failedImages.value = new Set([...failedImages.value].filter(url => nextImages.includes(url)))
})

function selectImage(url: string) {
  activeImage.value = url
  activeMedia.value = 'images'
}

function markFailed(url: string) {
  failedImages.value = new Set(failedImages.value).add(url)
}

function thumbnailSource(url: string) {
  return trustedImageVariant(url, 320, siteUrl) || url
}
</script>

<template>
  <div class="product-gallery">
    <div class="product-gallery__stage">
      <MediaPlaceholder
        v-if="activeMedia === 'images'"
        :label="name"
        :alt="activeImage ? `${name} 产品图片 ${images.indexOf(activeImage) + 1}` : `${name} 产品图片`"
        :src="activeImage"
        loading="eager"
        responsive="detail"
        sizes="(max-width: 900px) calc(100vw - 30px), 52vw"
      />
      <video
        v-else-if="videoUrl && isDirectVideo"
        class="product-gallery__video"
        controls
        preload="metadata"
        :poster="videoPoster"
      >
        <source :src="videoUrl">
      </video>
      <div v-else class="product-gallery__video-link">
        <span class="product-gallery__play" aria-hidden="true" />
        <strong>{{ name }} 产品视频</strong>
        <a class="button button--secondary" :href="videoUrl" target="_blank" rel="noopener noreferrer">查看视频</a>
      </div>
    </div>

    <div class="product-gallery__switcher" aria-label="产品媒体类型">
      <button
        type="button"
        :class="{ 'is-active': activeMedia === 'images' }"
        :aria-pressed="activeMedia === 'images'"
        @click="activeMedia = 'images'"
      >
        图片 <span>{{ images.length }}</span>
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeMedia === 'video' }"
        :aria-pressed="activeMedia === 'video'"
        :disabled="!videoUrl"
        @click="activeMedia = 'video'"
      >
        视频 <span>{{ videoUrl ? 1 : 0 }}</span>
      </button>
    </div>

    <div v-if="activeMedia === 'images' && images.length > 1" class="product-gallery__thumbnails" :aria-label="`${name} 图片选择`">
      <button
        v-for="(imageUrl, index) in images"
        :key="imageUrl"
        type="button"
        class="product-gallery__thumbnail"
        :class="{ 'is-active': imageUrl === activeImage }"
        :aria-label="`查看 ${name} 图片 ${index + 1}`"
        :aria-pressed="imageUrl === activeImage"
        @click="selectImage(imageUrl)"
      >
        <img v-if="!failedImages.has(imageUrl)" :src="thumbnailSource(imageUrl)" alt="" loading="lazy" decoding="async" @error="markFailed(imageUrl)">
        <span v-else aria-hidden="true">{{ index + 1 }}</span>
      </button>
    </div>
  </div>
</template>
