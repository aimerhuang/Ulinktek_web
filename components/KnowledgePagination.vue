<script setup lang="ts">
import { paginatedPath, paginationItems } from '~/shared/content/pagination'

const props = defineProps<{ basePath: string, currentPage: number, totalPages: number, label: string }>()

const visibleItems = computed(() => paginationItems(props.totalPages, props.currentPage))

function pageTo(page: number) {
  return paginatedPath(props.basePath, page)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="product-pagination media-pagination" :aria-label="label">
    <NuxtLink
      class="product-pagination__control"
      :class="{ 'is-disabled': currentPage === 1 }"
      :to="pageTo(Math.max(1, currentPage - 1))"
      :aria-disabled="currentPage === 1"
      :tabindex="currentPage === 1 ? -1 : undefined"
    >上一页</NuxtLink>
    <template v-for="(item, index) in visibleItems" :key="`${item}-${index}`">
      <span v-if="item === 'ellipsis'" class="product-pagination__ellipsis" aria-hidden="true">...</span>
      <NuxtLink
        v-else
        class="product-pagination__page"
        :class="{ 'is-current': item === currentPage }"
        :to="pageTo(item)"
        :aria-current="item === currentPage ? 'page' : undefined"
      >{{ item }}</NuxtLink>
    </template>
    <NuxtLink
      class="product-pagination__control"
      :class="{ 'is-disabled': currentPage === totalPages }"
      :to="pageTo(Math.min(totalPages, currentPage + 1))"
      :aria-disabled="currentPage === totalPages"
      :tabindex="currentPage === totalPages ? -1 : undefined"
    >下一页</NuxtLink>
  </nav>
</template>
