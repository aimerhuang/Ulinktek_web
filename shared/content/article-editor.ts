export type ArticleVideoSource = 'local' | 'external'

export type ArticleVideoBlock = {
  kind: 'video'
  sourceType: ArticleVideoSource
  url: string
  poster?: string
  title?: string
  provider?: string
}

export function normalizeArticleSlug(value: string | undefined, fallback: string) {
  const normalized = value?.trim().toLowerCase() || ''
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : fallback
}

export function validateArticleVideoUrl(value: string, sourceType: ArticleVideoSource) {
  const normalized = value.trim()
  if (!normalized || normalized.includes('\\') || normalized.startsWith('data:') || normalized.startsWith('javascript:')) return undefined
  if (sourceType === 'local' && /^\/assets\/[^?#]+$/i.test(normalized)) return normalized
  if (sourceType === 'external' && /^https:\/\//i.test(normalized)) return normalized
  return undefined
}

export function articleVideoBlock(value: Omit<ArticleVideoBlock, 'kind'>): ArticleVideoBlock | undefined {
  const url = validateArticleVideoUrl(value.url, value.sourceType)
  return url ? { ...value, kind: 'video', url } : undefined
}
