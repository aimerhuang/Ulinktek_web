export type PublishedPage<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export function asPublishedPage<T>(value: unknown, endpoint: string): PublishedPage<T> {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { items?: unknown }).items)) {
    throw new Error(`Published content API returned an invalid ${endpoint} response.`)
  }

  const page = Number((value as { page?: unknown }).page)
  const pageSize = Number((value as { pageSize?: unknown }).pageSize)
  const total = Number((value as { total?: unknown }).total)
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || !Number.isInteger(total) || total < 0) {
    throw new Error(`Published content API returned an invalid ${endpoint} pagination response.`)
  }

  return { items: (value as { items: T[] }).items, page, pageSize, total }
}

export async function getPublishedPageItems<T>(endpoint: string, fetchPage: (page: number, pageSize: number) => Promise<unknown>, pageSize = 100): Promise<T[]> {
  const firstPage = asPublishedPage<T>(await fetchPage(1, pageSize), endpoint)
  const items = [...firstPage.items]
  const pageCount = Math.ceil(firstPage.total / firstPage.pageSize)

  for (let page = 2; page <= pageCount; page += 1) {
    items.push(...asPublishedPage<T>(await fetchPage(page, pageSize), endpoint).items)
  }

  return items
}
