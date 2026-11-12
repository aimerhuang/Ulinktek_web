<script setup lang="ts">
import type { ProductCategoryFaq as ProductCategoryFaqItem } from '~/shared/content/product-category-landing'

defineProps<{ faqs: ProductCategoryFaqItem[] }>()
</script>

<template>
  <section class="product-category-module product-category-faq" aria-labelledby="product-category-faq-title">
    <div class="product-category-module__heading">
      <h2 id="product-category-faq-title">常见问题</h2>
    </div>
    <div class="product-category-faq__list">
      <details v-for="faq in faqs" :key="faq.id">
        <summary>{{ faq.question }}</summary>
        <div class="product-category-faq__answer rich-content" v-html="faq.answerHtml" />
      </details>
    </div>
  </section>
</template>
