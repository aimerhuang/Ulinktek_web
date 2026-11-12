import { onBeforeUnmount, onMounted, toValue, type MaybeRefOrGetter } from 'vue'

export type PageBreadcrumbParent = { label: string, to: string }
export type PageBreadcrumbCurrent = { path: string, label: string, parents: PageBreadcrumbParent[] }

// `parents` are inserted before the current item, e.g. the knowledge category of an article.
export function usePageBreadcrumbLabel(
  path: MaybeRefOrGetter<string>,
  label: MaybeRefOrGetter<string>,
  parents: MaybeRefOrGetter<PageBreadcrumbParent[]> = [],
) {
  const current = useState<PageBreadcrumbCurrent | undefined>('page-breadcrumb-current', () => undefined)

  onMounted(() => {
    current.value = { path: toValue(path), label: toValue(label), parents: toValue(parents) }
  })
  onBeforeUnmount(() => {
    if (current.value?.path === toValue(path)) current.value = undefined
  })
}
