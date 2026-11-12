<script setup lang="ts">
import type { ProductCategorySelectionTable } from '~/shared/content/product-category-landing'

defineProps<{ table: ProductCategorySelectionTable }>()
</script>

<template>
  <section class="product-category-module product-category-selection" aria-labelledby="product-category-selection-title">
    <div class="product-category-module__heading">
      <h2 id="product-category-selection-title">快速选型表</h2>
    </div>
    <div class="product-category-selection__scroll" tabindex="0" aria-label="快速选型表，可横向滚动">
      <table>
        <caption class="visually-hidden">快速选型表</caption>
        <thead>
          <tr>
            <th v-for="column in table.columns" :key="column.key" scope="col">{{ column.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in table.rows" :key="row.id">
            <td v-for="column in table.columns" :key="column.key">
              <NuxtLink v-if="column.key === 'model' && row.product" :to="`/zh/products/${row.product.slug}`">
                {{ row.cells[column.key] || row.product.model }}
              </NuxtLink>
              <span v-else>{{ row.cells[column.key] }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

