import { KNOWLEDGE_BASE_PATH } from './knowledge.ts'
import { requireNavigationLabelByPath, type SiteNavigationItem } from './navigation.ts'

export type BreadcrumbItem = Pick<SiteNavigationItem, 'label' | 'to' | 'external' | 'openInNewWindow'> & { current: boolean }

type RouteLocation = { path: string, query: Record<string, unknown> }

const routeLabels: Array<[RegExp, string]> = [
  [/^\/zh\/resources\/videos\/[^/]+$/, '视频详情'],
  [/^\/zh\/resources\/downloads\/[^/]+$/, '下载详情'],
  [/^\/zh\/forum\/login$/, '论坛登录'],
  [/^\/zh\/forum\/register$/, '论坛注册'],
  [/^\/zh\/forum\/new$/, '发布帖子'],
  [/^\/zh\/forum\/profile$/, '个人资料'],
  [/^\/zh\/forum\/category\/\d+$/, '社区分类'],
  [/^\/zh\/forum\/users\/\d+$/, '社区用户'],
  [/^\/zh\/forum\/\d+$/, '帖子详情'],
  [/^\/zh\/products\/categories\/[^/]+$/, '产品分类'],
  [/^\/zh\/products\/[^/]+$/, '产品详情'],
  [new RegExp(`^${KNOWLEDGE_BASE_PATH}/categories/[^/]+$`), '知识分类'],
  [new RegExp(`^${KNOWLEDGE_BASE_PATH}/[^/]+$`), '知识文章'],
  [/^\/zh\/resources\/[^/]+$/, '资料详情'],
  [/^\/zh\/solutions\/property-drainage-inspection$/, '物业排水管检测'],
  [/^\/zh\/oem-odm$/, 'OEM/ODM 定制'],
  [/^\/zh\/about$/, '关于优联'],
  [/^\/zh\/contact$/, '联系我们'],
  [/^\/zh\/faq$/, '常见问题'],
  [/^\/zh\/support$/, '服务支持'],
  [/^\/zh\/terms$/, '用户协议'],
  [/^\/zh\/privacy$/, '隐私政策'],
]

function matchesRoute(item: SiteNavigationItem, route: RouteLocation) {
  if (item.external) return -1

  const target = new URL(item.to, 'https://ulink.local')
  const pathMatches = route.path === target.pathname || route.path.startsWith(`${target.pathname}/`)
  if (!pathMatches) return -1

  for (const [key, value] of target.searchParams) {
    const routeValue = route.query[key]
    if (Array.isArray(routeValue) ? !routeValue.includes(value) : routeValue !== value) return -1
  }

  return (route.path === target.pathname ? 10_000 : 0) + target.pathname.length + target.search.length * 100
}

function findTrail(items: SiteNavigationItem[], route: RouteLocation, ancestors: SiteNavigationItem[] = []): SiteNavigationItem[] | undefined {
  let best: { score: number, trail: SiteNavigationItem[] } | undefined
  for (const item of items) {
    const trail = [...ancestors, item]
    const score = matchesRoute(item, route)
    if (score >= 0 && (!best || score > best.score)) best = { score, trail }
    const childTrail = findTrail(item.children, route, trail)
    if (childTrail) {
      const childScore = matchesRoute(childTrail.at(-1)!, route)
      if (!best || childScore > best.score) best = { score: childScore, trail: childTrail }
    }
  }
  return best?.trail
}

function fallbackLabel(path: string) {
  return routeLabels.find(([pattern]) => pattern.test(path))?.[1] || '当前位置'
}

export function getBreadcrumbs(navigation: SiteNavigationItem[], route: RouteLocation): BreadcrumbItem[] {
  if (route.path === '/zh' || route.path === '/') return []

  if (route.path === '/zh/faq') {
    return [
      { label: '首页', to: '/', external: false, openInNewWindow: false, current: false },
      { label: requireNavigationLabelByPath(navigation, '/zh/faq'), to: '/zh/faq', external: false, openInNewWindow: false, current: true },
    ]
  }

  const trail = findTrail(navigation, route) || []
  const breadcrumbs: BreadcrumbItem[] = [
    { label: '首页', to: '/', external: false, openInNewWindow: false, current: false },
    ...trail.map(item => ({ label: item.label, to: item.to, external: item.external, openInNewWindow: item.openInNewWindow, current: false })),
  ]
  const label = fallbackLabel(route.path)
  if (!trail.length || matchesRoute(trail.at(-1)!, route) < 10_000) {
    breadcrumbs.push({ label, to: route.path, external: false, openInNewWindow: false, current: true })
  } else {
    const current = breadcrumbs.at(-1)
    if (current) current.current = true
  }
  return breadcrumbs
}
