import { paginatedPath, parsePaginationQuery } from './pagination.ts'

export const PRODUCT_CATEGORY_PATH_PREFIX = '/zh/products/categories/'
const canonicalCategorySlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export type LegacyProductCategoryQuery = {
  slug: string
  page: number
}

export function isCanonicalProductCategorySlug(value: unknown): value is string {
  return typeof value === 'string'
    && value.length <= 200
    && canonicalCategorySlug.test(value)
}

export function productCategoryPath(slug: string) {
  if (!isCanonicalProductCategorySlug(slug)) throw new TypeError('Invalid canonical product category slug.')
  return `${PRODUCT_CATEGORY_PATH_PREFIX}${encodeURIComponent(slug)}`
}

export function productCategoryPagePath(slug: string, page: number) {
  return paginatedPath(productCategoryPath(slug), page)
}

export function parseLegacyProductCategoryQuery(query: Record<string, unknown>): LegacyProductCategoryQuery | undefined {
  const keys = Object.keys(query)
  if (keys.some(key => key !== 'category' && key !== 'page')) return undefined
  if (!isCanonicalProductCategorySlug(query.category)) return undefined

  const pagination = parsePaginationQuery(query.page)
  if (!pagination.canonical && query.page !== '1') return undefined
  return { slug: query.category, page: pagination.page }
}

export function parseLegacyProductCategoryPath(value: string): LegacyProductCategoryQuery | undefined {
  let url: URL
  try {
    url = new URL(value, 'https://category.local')
  } catch {
    return undefined
  }

  if (url.origin !== 'https://category.local' || url.pathname !== '/zh/products' || !url.search || url.hash) return undefined
  const keys = [...url.searchParams.keys()]
  if (url.searchParams.getAll('category').length !== 1 || url.searchParams.getAll('page').length > 1) return undefined
  if (keys.some(key => key !== 'category' && key !== 'page')) return undefined
  return parseLegacyProductCategoryQuery({
    category: url.searchParams.get('category') || undefined,
    page: url.searchParams.has('page') ? url.searchParams.get('page') || undefined : undefined,
  })
}

export function normalizeLegacyProductCategoryPath(value: string) {
  const parsed = parseLegacyProductCategoryPath(value)
  return parsed ? productCategoryPagePath(parsed.slug, parsed.page) : undefined
}
