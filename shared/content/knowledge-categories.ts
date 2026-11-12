import { isCanonicalKnowledgeCategorySlug } from './knowledge.ts'

/** 文章所属的启用分类；后端只在分类启用时返回。 */
export type KnowledgeCategoryRef = {
  name: string
  slug: string
}

export type KnowledgeCategory = KnowledgeCategoryRef & {
  description: string
  seoTitle?: string
  seoDescription?: string
  sort: number
  publishedArticleCount: number
  latestPublishedAt?: string
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function optionalText(value: unknown, field: string) {
  if (value === null || value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`Knowledge category API returned an invalid ${field}.`)
  return value.trim() || undefined
}

function requiredText(value: unknown, field: string) {
  const text = optionalText(value, field)
  if (!text) throw new Error(`Knowledge category API returned an empty ${field}.`)
  return text
}

function nonNegativeInteger(value: unknown, field: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new Error(`Knowledge category API returned an invalid ${field}.`)
  return value
}

/** 文章 DTO 中的分类引用：缺失或不合规时视为未分类，而不是丢弃文章。 */
export function readKnowledgeCategoryRef(value: unknown): KnowledgeCategoryRef | undefined {
  const source = objectValue(value)
  const name = typeof source?.name === 'string' ? source.name.trim() : ''
  const slug = typeof source?.slug === 'string' ? source.slug.trim() : ''
  return name && isCanonicalKnowledgeCategorySlug(slug) ? { name, slug } : undefined
}

export function decodeKnowledgeCategory(value: unknown): KnowledgeCategory {
  const source = objectValue(value)
  if (!source) throw new Error('Knowledge category API returned an invalid category.')
  const slug = requiredText(source.slug, 'category slug')
  if (!isCanonicalKnowledgeCategorySlug(slug)) throw new Error('Knowledge category API returned a non-canonical category slug.')
  if (typeof source.sort !== 'number' || !Number.isInteger(source.sort)) throw new Error('Knowledge category API returned an invalid category sort.')
  return {
    name: requiredText(source.name, 'category name'),
    slug,
    description: optionalText(source.description, 'category description') || '',
    seoTitle: optionalText(source.seoTitle, 'category seoTitle'),
    seoDescription: optionalText(source.seoDescription, 'category seoDescription'),
    sort: source.sort,
    publishedArticleCount: nonNegativeInteger(source.publishedArticleCount, 'publishedArticleCount'),
    latestPublishedAt: optionalText(source.latestPublishedAt, 'category latestPublishedAt'),
  }
}

export function decodeKnowledgeCategoryList(value: unknown): KnowledgeCategory[] {
  const items = objectValue(value)?.items
  if (!Array.isArray(items)) throw new Error('Knowledge category API returned an invalid category list.')
  return items.map(decodeKnowledgeCategory)
}

/** 分类标签、首页链接与 discovery 只展示有已发布文章的分类。 */
export function visibleKnowledgeCategories(categories: readonly KnowledgeCategory[]) {
  return categories.filter(category => category.publishedArticleCount > 0)
}
