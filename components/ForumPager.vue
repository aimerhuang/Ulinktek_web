<script setup lang="ts">
import type { PageState } from 'primevue/paginator'

const props = defineProps<{ page: number, pageSize: number, total: number }>()
const emit = defineEmits<{ change: [page: number] }>()
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

function changePage(event: PageState) {
  emit('change', event.page + 1)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="forum-pagination" aria-label="论坛分页">
    <Paginator
      :first="(page - 1) * pageSize"
      :rows="pageSize"
      :total-records="total"
      :page-link-size="5"
      template="PrevPageLink PageLinks NextPageLink"
      @page="changePage"
    />
  </nav>
</template>
