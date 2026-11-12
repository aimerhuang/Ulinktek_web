export type PaginationQueryState = {
  page: number
  canonical: boolean
}

export type PaginationDecision = PaginationQueryState & {
  action: 'render' | 'redirect' | 'not-found'
}

export function parsePaginationQuery(value: unknown): PaginationQueryState {
  if (value === undefined) return { page: 1, canonical: true }
  if (typeof value !== 'string') return { page: 1, canonical: false }

  if (/^[1-9]\d*$/u.test(value)) {
    const page = Number(value)
    return Number.isSafeInteger(page)
      ? { page, canonical: page !== 1 }
      : { page: 1, canonical: false }
  }

  if (/^0*([1-9]\d*)$/u.test(value)) {
    const page = Number(value)
    if (Number.isSafeInteger(page)) return { page, canonical: false }
  }

  return { page: 1, canonical: false }
}

export function resolvePagination(value: unknown, totalPages: number): PaginationDecision {
  if (!Number.isSafeInteger(totalPages) || totalPages < 0) {
    throw new TypeError('Pagination totalPages must be a non-negative safe integer.')
  }

  const parsed = parsePaginationQuery(value)
  if (!parsed.canonical) return { ...parsed, action: 'redirect' }
  if (parsed.page > Math.max(1, totalPages)) return { ...parsed, action: 'not-found' }
  return { ...parsed, action: 'render' }
}

export function paginatedPath(path: string, page: number) {
  if (!Number.isSafeInteger(page) || page <= 0) throw new TypeError('Pagination page must be a positive safe integer.')
  return page === 1 ? path : `${path}?page=${page}`
}

export function paginatedTitle(title: string, page: number) {
  return page === 1 ? title : `${title} - 第 ${page} 页`
}

export function paginationItems(totalPages: number, currentPage: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)
  const nearbyPages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  const pages = [...nearbyPages].filter(page => page > 0 && page <= totalPages).sort((left, right) => left - right)
  return pages.flatMap((page, index) => index > 0 && page - pages[index - 1]! > 1 ? ['ellipsis', page] : [page])
}
