import type { SiteNavigationItem } from '~/shared/content/navigation'
import { requireNavigationLabelByPath } from '~/shared/content/navigation'

export function useResourceNavigationLabels() {
  const navigation = useState<SiteNavigationItem[] | undefined>('site-navigation').value

  return {
    resourceLabel: requireNavigationLabelByPath(navigation, '/zh/resources'),
    videoLabel: requireNavigationLabelByPath(navigation, '/zh/resources/videos'),
    downloadLabel: requireNavigationLabelByPath(navigation, '/zh/resources/downloads'),
  }
}
