<script setup lang="ts">
defineProps<{ intro: string }>()
</script>

<template>
  <p class="product-category-intro">{{ intro }}</p>
</template>
