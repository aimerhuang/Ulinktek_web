import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { SiteNavigationItem } from '~/shared/content/navigation'
import { requireNavigationLabelByPath } from '~/shared/content/navigation'

export function useNavigationLabel(path: MaybeRefOrGetter<string>) {
  const navigation = useState<SiteNavigationItem[] | undefined>('site-navigation')
  return computed(() => requireNavigationLabelByPath(navigation.value, toValue(path)))
}
