export type ArticleSeo = {
  title: string
  keywords?: string
  description: string
  canonicalPath: string
}

export type ArticleMetadata = {
  tags: string[]
  seo: ArticleSeo
}

type ArticleMetadataFallback = {
  title: string
  summary: string
  slug: string
}

export function projectArticleMetadata(value: unknown, fallback: ArticleMetadataFallback): ArticleMetadata {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  const tags = Array.isArray(source.tags)
    ? source.tags.flatMap(tag => typeof tag === 'string' && tag.trim() ? [tag.trim()] : [])
    : []
  const seo = source.seo && typeof source.seo === 'object' && !Array.isArray(source.seo)
    ? source.seo as Record<string, unknown>
    : {}
  const canonicalPath = `/zh/knowledge/${fallback.slug}`
  const resolvedCanonicalPath = text(seo.canonicalPath)
  return {
    tags,
    seo: {
      title: text(seo.title) || fallback.title,
      keywords: text(seo.keywords) || undefined,
      description: text(seo.description) || fallback.summary,
      canonicalPath: resolvedCanonicalPath === canonicalPath ? resolvedCanonicalPath : canonicalPath,
    },
  }
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
