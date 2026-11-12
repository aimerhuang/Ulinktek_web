<script setup lang="ts">
import type {} from '@amap/amap-jsapi-types'
import { Navigation } from 'lucide-vue-next'
import type { AmapLocation } from '~/shared/content/contact-map'
import { buildAmapNavigationUrl } from '~/shared/content/contact-map'

type MapState = 'unconfigured' | 'loading' | 'ready' | 'error'
type AmapApi = AMap.NameSpace & {
  ToolBar: new () => AMap.Control
  Scale: new () => AMap.Control
}

const props = defineProps<{
  location?: AmapLocation
  apiKey: string
}>()

const config = useRuntimeConfig()
const mapContainer = ref<HTMLDivElement>()
const state = ref<MapState>(props.location ? 'loading' : 'unconfigured')
const navigationUrl = computed(() => props.location ? buildAmapNavigationUrl(props.location) : undefined)
let map: AMap.Map | undefined
let loadTimeout: ReturnType<typeof setTimeout> | undefined
let disposed = false

function clearLoadTimeout() {
  if (loadTimeout) clearTimeout(loadTimeout)
  loadTimeout = undefined
}

function destroyMap() {
  clearLoadTimeout()
  map?.destroy()
  map = undefined
}

function showLoadError() {
  if (disposed) return
  destroyMap()
  state.value = 'error'
}

onMounted(async () => {
  if (!props.location || !mapContainer.value) return
  if (!props.apiKey.trim()) return showLoadError()

  const appBase = config.app.baseURL.endsWith('/') ? config.app.baseURL : `${config.app.baseURL}/`
  const securityConfig = window as Window & { _AMapSecurityConfig?: { serviceHost: string } }
  securityConfig._AMapSecurityConfig = {
    serviceHost: new URL(`${appBase}_AMapService`, window.location.origin).toString().replace(/\/$/, ''),
  }

  try {
    const { load } = await import('@amap/amap-jsapi-loader')
    const AMapApi = await load({
      key: props.apiKey.trim(),
      version: '2.0',
      plugins: ['AMap.ToolBar', 'AMap.Scale'],
    }) as AmapApi
    if (disposed || !mapContainer.value) return

    map = new AMapApi.Map(mapContainer.value, {
      center: [props.location.longitude, props.location.latitude],
      zoom: 16,
      viewMode: '2D',
      dragEnable: true,
      zoomEnable: true,
    })
    map.add(new AMapApi.Marker({
      position: [props.location.longitude, props.location.latitude],
      title: props.location.companyName || props.location.address,
      anchor: 'bottom-center',
    }))
    map.addControl(new AMapApi.ToolBar())
    map.addControl(new AMapApi.Scale())
    map.on('complete', () => {
      if (disposed) return
      clearLoadTimeout()
      state.value = 'ready'
    })
    loadTimeout = setTimeout(showLoadError, 12000)
  } catch {
    showLoadError()
  }
})

onBeforeUnmount(() => {
  disposed = true
  destroyMap()
})
</script>

<template>
  <div class="contact-map">
    <div class="contact-map__surface" role="region" aria-label="优联科技办公地址地图">
      <div v-if="location" ref="mapContainer" class="contact-map__canvas" />
      <div v-if="state !== 'ready'" class="contact-map__state" :class="`contact-map__state--${state}`" role="status" aria-live="polite">
        <span v-if="state === 'loading'">地图加载中</span>
        <span v-else-if="state === 'error'">地图暂时无法加载</span>
        <span v-else>地图位置暂未配置</span>
      </div>
    </div>
    <div v-if="navigationUrl" class="contact-map__actions">
      <a class="button button--secondary contact-map__navigate" :href="navigationUrl" target="_blank" rel="noopener noreferrer">
        <Navigation :size="17" aria-hidden="true" />
        在高德地图中导航
      </a>
    </div>
  </div>
</template>
