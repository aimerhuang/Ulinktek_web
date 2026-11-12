import { KNOWLEDGE_BASE_PATH, LEGACY_KNOWLEDGE_BASE_PATH } from './knowledge.ts'
import { normalizeLegacyProductCategoryPath } from './product-category.ts'

export type NavigationDisplayStyle = 'default' | 'cta'

export type SiteNavigationItem = {
  id: number
  label: string
  to: string
  external: boolean
  openInNewWindow: boolean
  displayStyle: NavigationDisplayStyle
  children: SiteNavigationItem[]
}

const LEGACY_INTERNAL_PATHS: Record<string, string> = {
  '/zh': '/',
  '/zh/': '/',
  [LEGACY_KNOWLEDGE_BASE_PATH]: KNOWLEDGE_BASE_PATH,
  [`${LEGACY_KNOWLEDGE_BASE_PATH}/`]: KNOWLEDGE_BASE_PATH,
  '/zh/support#faq': '/zh/faq',
  '/zh/resources#videos': '/zh/resources/videos',
  '/zh/resources#software': '/zh/resources/downloads',
  '/zh/resources#manuals': '/zh/resources/downloads',
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Published navigation contains an invalid ${field}.`)
  }
  return value as Record<string, unknown>
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Published navigation contains an invalid ${field}.`)
  }
  return value.trim()
}

function hasControlCharacters(value: string) {
  return /[\u0000-\u001f\u007f]/.test(value)
}

function safeInternalPath(value: unknown) {
  const path = requiredString(value, 'path')
  if (!path.startsWith('/') || path.startsWith('//') || hasControlCharacters(path)) {
    throw new Error('Published navigation contains an unsafe internal path.')
  }
  return LEGACY_INTERNAL_PATHS[path] || normalizeLegacyProductCategoryPath(path) || path
}

function safeExternalUrl(value: unknown) {
  const rawUrl = requiredString(value, 'externalUrl')
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Published navigation contains an invalid external URL.')
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Published navigation external URLs must use credential-free HTTPS.')
  }
  return url.toString()
}

function safeAnchor(value: unknown) {
  const anchor = requiredString(value, 'anchor path')
  if (!anchor.startsWith('#') || anchor.length === 1 || hasControlCharacters(anchor)) {
    throw new Error('Published navigation contains an unsafe anchor.')
  }
  return anchor
}

function parseItems(value: unknown, depth: number, seenIds: Set<number>): SiteNavigationItem[] {
  if (!Array.isArray(value)) throw new Error('Published navigation must be an array.')
  if (depth > 3) throw new Error('Published navigation exceeds three levels.')

  return value.map((entry) => {
    const node = asRecord(entry, 'node')
    const id = node.id
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0 || seenIds.has(id)) {
      throw new Error('Published navigation contains an invalid or duplicate id.')
    }
    seenIds.add(id)

    const label = requiredString(node.title, 'title')
    const displayStyle = requiredString(node.displayStyle, 'displayStyle')
    if (displayStyle !== 'default' && displayStyle !== 'cta') {
      throw new Error('Published navigation contains an unsupported displayStyle.')
    }
    if (typeof node.openInNewWindow !== 'boolean') {
      throw new Error('Published navigation contains an invalid openInNewWindow value.')
    }

    const linkType = requiredString(node.linkType, 'linkType')
    let to: string
    let external = false
    if (linkType === 'internal_path') to = safeInternalPath(node.path)
    else if (linkType === 'external_url') {
      to = safeExternalUrl(node.externalUrl)
      external = true
    } else if (linkType === 'anchor') to = safeAnchor(node.path)
    else if (linkType === 'resource') {
      throw new Error('Published navigation resource links are not supported until a stable public resolver exists.')
    } else throw new Error('Published navigation contains an unsupported linkType.')

    if (!Array.isArray(node.children)) throw new Error('Published navigation children must be an array.')
    const children = node.children.length ? parseItems(node.children, depth + 1, seenIds) : []
    if (displayStyle === 'cta' && (depth !== 1 || children.length)) {
      throw new Error('Published navigation CTA must be a root item without children.')
    }

    return { id, label, to, external, openInNewWindow: node.openInNewWindow, displayStyle, children }
  })
}

export function parseMainNavigation(value: unknown): SiteNavigationItem[] {
  const navigation = parseItems(value, 1, new Set<number>())
  if (!navigation.length) throw new Error('Published main navigation must contain at least one root item.')
  if (navigation.filter(item => item.displayStyle === 'cta').length > 1) {
    throw new Error('Published main navigation can contain only one CTA.')
  }
  return navigation
}

export function findNavigationLabelByPath(items: SiteNavigationItem[], path: string): string | undefined {
  for (const item of items) {
    if (!item.external && item.to === path) return item.label
    const childLabel = findNavigationLabelByPath(item.children, path)
    if (childLabel) return childLabel
  }
  return undefined
}

export function requireNavigationLabelByPath(items: SiteNavigationItem[] | undefined, path: string): string {
  if (!items) throw new Error('Required site navigation was not generated.')
  const label = findNavigationLabelByPath(items, path)
  if (!label) throw new Error(`Published main navigation is missing required path: ${path}.`)
  return label
}
