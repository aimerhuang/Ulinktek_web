export const KNOWLEDGE_BASE_PATH = '/zh/knowledge'
export const LEGACY_KNOWLEDGE_BASE_PATH = '/zh/media'
export const KNOWLEDGE_CATEGORY_DIRECTORY_PATH = `${KNOWLEDGE_BASE_PATH}/categories`
export const KNOWLEDGE_CATEGORY_PATH_PREFIX = `${KNOWLEDGE_CATEGORY_DIRECTORY_PATH}/`
const canonicalKnowledgeCategorySlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export function knowledgeArticlePath(slug: string) {
  return `${KNOWLEDGE_BASE_PATH}/${slug}`
}

export function articlePublicSlug(article: { slug: string, customSlug?: string | null }) {
  const custom = article.customSlug?.trim()
  return custom && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(custom) ? custom.toLowerCase() : article.slug
}

export function isCanonicalKnowledgeCategorySlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 100 && canonicalKnowledgeCategorySlug.test(value)
}

export function knowledgeCategoryPath(slug: string) {
  if (!isCanonicalKnowledgeCategorySlug(slug)) throw new TypeError('Invalid canonical knowledge category slug.')
  return `${KNOWLEDGE_CATEGORY_PATH_PREFIX}${slug}`
}
