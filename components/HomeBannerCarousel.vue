<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

type HomeBanner = {
  id: string
  title: string
  description?: string
  imageUrl: string
  mobileImageUrl?: string
  alt: string
}

const props = defineProps<{ banners: HomeBanner[] }>()
const activeIndex = ref(0)
let rotationTimer: ReturnType<typeof setInterval> | undefined

const activeBanner = computed(() => props.banners[activeIndex.value])

function selectBanner(index: number) {
  activeIndex.value = index
}

function showNextBanner() {
  selectBanner((activeIndex.value + 1) % props.banners.length)
}

function showPreviousBanner() {
  selectBanner((activeIndex.value - 1 + props.banners.length) % props.banners.length)
}

function pauseRotation() {
  if (rotationTimer) clearInterval(rotationTimer)
  rotationTimer = undefined
}

function startRotation() {
  pauseRotation()
  if (props.banners.length > 1) rotationTimer = setInterval(showNextBanner, 6000)
}

watch(() => props.banners.length, () => {
  activeIndex.value = 0
  startRotation()
})

onMounted(startRotation)
onBeforeUnmount(pauseRotation)
</script>

<template>
  <section v-if="activeBanner" class="home-banner" aria-roledescription="carousel" aria-label="首页轮播图" @mouseenter="pauseRotation" @mouseleave="startRotation" @focusin="pauseRotation" @focusout="startRotation">
    <figure class="home-banner__slide">
      <div class="home-banner__media">
        <picture>
          <source v-if="activeBanner.mobileImageUrl" media="(max-width: 768px)" :srcset="activeBanner.mobileImageUrl">
          <img :src="activeBanner.imageUrl" :alt="activeBanner.alt" fetchpriority="high" decoding="async">
        </picture>

        <template v-if="banners.length > 1">
          <button class="home-banner__control home-banner__control--previous" type="button" title="上一张" aria-label="上一张轮播图" @click="showPreviousBanner"><ChevronLeft :size="26" aria-hidden="true" /></button>
          <button class="home-banner__control home-banner__control--next" type="button" title="下一张" aria-label="下一张轮播图" @click="showNextBanner"><ChevronRight :size="26" aria-hidden="true" /></button>
          <div class="home-banner__indicators" aria-label="轮播图分页">
            <button v-for="(banner, index) in banners" :key="banner.id" class="home-banner__indicator" :class="{ 'is-active': index === activeIndex }" type="button" :aria-label="`显示第 ${index + 1} 张轮播图`" :aria-current="index === activeIndex ? 'true' : undefined" @click="selectBanner(index)" />
          </div>
        </template>
      </div>
      <figcaption v-if="activeBanner.title || activeBanner.description" class="home-banner__caption">
        <strong v-if="activeBanner.title">{{ activeBanner.title }}</strong>
        <span v-if="activeBanner.description">{{ activeBanner.description }}</span>
      </figcaption>
    </figure>
  </section>
</template>
