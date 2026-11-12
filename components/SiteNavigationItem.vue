<script setup lang="ts">
import type { SiteNavigationItem } from '~/shared/content/navigation'

const props = defineProps<{ item: SiteNavigationItem, depth?: number, resetKey: number }>()
const emit = defineEmits<{ navigate: [] }>()
const isExpanded = ref(false)
const depth = computed(() => props.depth ?? 0)
const hasChildren = computed(() => props.item.children.length > 0)

watch(() => props.resetKey, () => { isExpanded.value = false })

function closeOnBlur(event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null
  if (!nextTarget || !(event.currentTarget as HTMLElement).contains(nextTarget)) isExpanded.value = false
}

function openOnFocus(event: FocusEvent) {
  if (!hasChildren.value || (event.target as HTMLElement).closest('button')) return
  isExpanded.value = true
}

function usesCollapsedNavigation() {
  return window.matchMedia('(max-width: 1199px)').matches
}

function openOnHover() {
  if (!usesCollapsedNavigation()) isExpanded.value = hasChildren.value
}

function closeOnHover() {
  if (!usesCollapsedNavigation()) isExpanded.value = false
}

function handleEscape(event: KeyboardEvent) {
  if (!isExpanded.value) return
  event.preventDefault()
  event.stopPropagation()
  isExpanded.value = false
  nextTick(() => (event.currentTarget as HTMLElement).querySelector<HTMLElement>('a, button')?.focus())
}
</script>

<template>
  <SiteNavigationLink
    v-if="item.displayStyle === 'cta'"
    :item="item"
    class="nav-cta"
    @navigate="emit('navigate')"
  />
  <div
    v-else
    :class="[depth === 0 ? 'nav-menu' : 'nav-dropdown-item', { 'nav-menu--has-children': depth === 0 && hasChildren, 'has-children': hasChildren, 'is-active': isExpanded }]"
    @mouseenter="openOnHover"
    @mouseleave="closeOnHover"
    @focusin="openOnFocus"
    @focusout="closeOnBlur"
    @keydown="handleEscape"
  >
    <div :class="depth === 0 ? 'nav-menu__trigger' : 'nav-dropdown-item__trigger'">
      <SiteNavigationLink :item="item" @navigate="emit('navigate')" />
      <button
        v-if="hasChildren"
        type="button"
        :class="depth === 0 ? 'nav-menu__toggle' : 'nav-dropdown-item__toggle'"
        :aria-expanded="isExpanded"
        :aria-label="`${isExpanded ? '收起' : '展开'}${item.label}菜单`"
        @click="isExpanded = !isExpanded"
      ><span aria-hidden="true" /></button>
    </div>
    <div v-if="hasChildren" :class="depth === 0 ? 'nav-dropdown' : 'nav-dropdown-submenu'">
      <SiteNavigationItem
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :depth="depth + 1"
        :reset-key="resetKey"
        @navigate="emit('navigate')"
      />
    </div>
  </div>
</template>
