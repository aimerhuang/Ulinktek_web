<script setup lang="ts">
const props = defineProps<{
  title: string
  playbackUrl: string
  poster?: string
}>()

const player = ref<HTMLVideoElement>()
const playbackFailed = ref(false)

watch(() => props.playbackUrl, () => {
  playbackFailed.value = false
  player.value?.load()
})

onBeforeUnmount(() => {
  const video = player.value
  if (!video) return
  video.pause()
  video.removeAttribute('src')
  video.load()
})
</script>

<template>
  <div class="resource-player">
    <video
      ref="player"
      class="resource-player__video"
      controls
      playsinline
      preload="metadata"
      :poster="poster"
      :src="playbackUrl"
      :aria-label="`${title} 视频播放器`"
      @error="playbackFailed = true"
    >
      您的浏览器不支持视频播放。
    </video>
    <p v-if="playbackFailed" class="resource-player__fallback" role="status">
      视频暂时无法在页面内播放。
      <a :href="playbackUrl" target="_blank" rel="noopener noreferrer">在新窗口打开视频</a>
    </p>
  </div>
</template>
