<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  page: number
  pageSize: number
  total: number
  mode?: 'links' | 'local'
  to?: (page: number) => string
}>(), { mode: 'links' })
const emit = defineEmits<{ change: [page: number] }>()
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

if (props.mode === 'links' && !props.to) {
  throw new Error('ResourcePager link mode requires a page target function.')
}

function pageTarget(page: number) {
  if (!props.to) throw new Error('ResourcePager link mode requires a page target function.')
  return props.to(page)
}

const pages = computed(() => {
  const start = Math.max(1, Math.min(props.page - 2, totalPages.value - 4))
  const end = Math.min(totalPages.value, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})
</script>

<template>
  <nav v-if="totalPages > 1" class="resource-pagination" aria-label="资源列表分页">
    <template v-if="mode === 'links'">
      <span v-if="page <= 1" class="resource-pagination__disabled" aria-disabled="true" aria-label="上一页">
        <ChevronLeft :size="18" aria-hidden="true" />
      </span>
      <NuxtLink v-else :to="pageTarget(page - 1)" title="上一页" aria-label="上一页">
        <ChevronLeft :size="18" aria-hidden="true" />
      </NuxtLink>
      <NuxtLink
        v-for="number in pages"
        :key="number"
        :to="pageTarget(number)"
        :aria-current="number === page ? 'page' : undefined"
        :aria-label="`第 ${number} 页`"
      >{{ number }}</NuxtLink>
      <span v-if="page >= totalPages" class="resource-pagination__disabled" aria-disabled="true" aria-label="下一页">
        <ChevronRight :size="18" aria-hidden="true" />
      </span>
      <NuxtLink v-else :to="pageTarget(page + 1)" title="下一页" aria-label="下一页">
        <ChevronRight :size="18" aria-hidden="true" />
      </NuxtLink>
    </template>
    <template v-else>
      <button type="button" :disabled="page <= 1" title="上一页" aria-label="上一页" @click="emit('change', page - 1)">
        <ChevronLeft :size="18" aria-hidden="true" />
      </button>
      <button
        v-for="number in pages"
        :key="number"
        type="button"
        :aria-current="number === page ? 'page' : undefined"
        :aria-label="`第 ${number} 页`"
        @click="emit('change', number)"
      >{{ number }}</button>
      <button type="button" :disabled="page >= totalPages" title="下一页" aria-label="下一页" @click="emit('change', page + 1)">
        <ChevronRight :size="18" aria-hidden="true" />
      </button>
    </template>
  </nav>
</template>
