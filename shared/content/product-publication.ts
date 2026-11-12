import type { Product } from './products'

export type ProductPublicationSource = {
  name?: string | null
  modelNo?: string | null
  slug?: string | null
  productKind?: string | null
  summary?: string | null
  content?: string | null
  publishedAt?: string | null
}

export type ProductPublicationOptions = {
  categoryName?: string
  categorySlug?: string
  heroPath?: string
  galleryPaths?: string[]
  highlights?: Product['highlights']
  specifications?: Product['specifications']
  videoUrl?: string
  contentHtml?: string
}

const canonicalSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const modelToken = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/

export function normalizePublicationText(value?: string | null) {
  return (value || '')
    .normalize('NFKC')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncatePublicationText(value: string, maximum: number) {
  const normalized = normalizePublicationText(value)
  const characters = [...normalized]
  if (characters.length <= maximum) return normalized

  let shortened = characters.slice(0, Math.max(1, maximum - 1)).join('').trimEnd()
  const lastSpace = shortened.lastIndexOf(' ')
  if (lastSpace >= maximum - 24) shortened = shortened.slice(0, lastSpace)
  return `${shortened.replace(/[，,、;；:：。.!！?？\s]+$/u, '')}…`
}

// Name/value rows from the published specification table; rows made only of <th> cells are column headers.
export function productSpecificationRows(html?: string | null) {
  const rows = new Map<string, string>()
  for (const [, row] of (html || '').matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const cells = [...row!.matchAll(/<(t[hd])\b[^>]*>([\s\S]*?)<\/\1>/giu)]
    if (cells.length !== 2 || cells.every(([, tag]) => tag!.toLowerCase() === 'th')) continue
    const [name, value] = cells.map(([, , text]) => normalizePublicationText(text))
    if (name && value && !rows.has(name)) rows.set(name, value)
  }
  return [...rows].map(([name, value]) => ({ name, value }))
}

export function trustedProductModel(value: string | null | undefined, productKind: Product['productKind']) {
  const model = normalizePublicationText(value)
  if (!model || model.length > 40 || !modelToken.test(model) || /[\u3400-\u9fff]/u.test(model)) return undefined
  if (/^\d+$/u.test(model)) return productKind === 'finished_product' && model.length >= 4 ? model : undefined
  if (!/[A-Za-z]/u.test(model) || !/\d/u.test(model)) return undefined
  return model
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeProductName(value: string, model?: string) {
  let name = normalizePublicationText(value)
    .replace(/^高清系列\s+/u, '')
    .replace(/\s*产品型号\s*[:：]\s*[A-Za-z0-9._/、 -]+$/u, '')
    .trim()
  if (!model) return name

  const escapedModel = escapeRegExp(model)
  name = name.replace(new RegExp(`\\s*[-–—]\\s*${escapedModel}$`, 'iu'), '').trim()
  if (name !== model && new RegExp(`\\s+${escapedModel}$`, 'iu').test(name)) {
    name = name.replace(new RegExp(`\\s+${escapedModel}$`, 'iu'), '').trim()
  }
  return name || model
}

function titleContainsModel(title: string, model: string) {
  return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(model)}([^A-Za-z0-9]|$)`, 'iu').test(title)
}

export function compactProductSummary(value: string, fallback: string) {
  const normalized = normalizePublicationText(value).replace(/^简介及应用\s*/u, '')
  if (!normalized) return fallback

  const markerIndexes = [
    normalized.search(/\s+[1-9]\s*[、.．)]/u),
    normalized.search(/\s+(?:特点|照片)(?:\s|$)/u),
    normalized.search(/[●◎]/u),
  ].filter(index => index >= 12)
  const markerIndex = markerIndexes.length ? Math.min(...markerIndexes) : -1
  const overview = markerIndex > 0 ? normalized.slice(0, markerIndex).trim() : normalized
  const punctuated = markerIndex > 0 && !/[。.!！?？]$/u.test(overview) ? `${overview}。` : overview
  return truncatePublicationText(punctuated, 220)
}

export function projectPublishedProduct(source: ProductPublicationSource, options: ProductPublicationOptions = {}): Product | undefined {
  const slug = normalizePublicationText(source.slug).toLowerCase()
  if (!slug || slug.length > 200 || !canonicalSlug.test(slug)) return undefined

  const productKind: Product['productKind'] = source.productKind === 'accessory' ? 'accessory' : 'finished_product'
  const model = trustedProductModel(source.modelNo, productKind)
  const name = normalizeProductName(source.name || '', model)
  if (!name) return undefined

  const title = model && !titleContainsModel(name, model) ? `${model} ${name}` : name
  const fullDescription = normalizePublicationText(source.summary) || normalizePublicationText(source.content)
  const fallbackDescription = `${title}的产品规格与技术资料页面。`
  const description = fullDescription || fallbackDescription
  const summary = compactProductSummary(description, fallbackDescription)

  return {
    slug,
    model,
    title,
    category: normalizePublicationText(options.categoryName) || '产品中心',
    categorySlug: normalizePublicationText(options.categorySlug),
    name,
    summary,
    llmsSummary: summary,
    description,
    productKind,
    publishedAt: normalizePublicationText(source.publishedAt) || undefined,
    applications: [],
    highlights: options.highlights || [],
    specifications: options.specifications || {},
    videoUrl: options.videoUrl,
    seo: {
      title,
      description: truncatePublicationText(summary, 160),
    },
    contentHtml: options.contentHtml,
    media: {
      heroAlt: `${title} 产品图片`,
      heroPath: options.heroPath,
      galleryPaths: options.galleryPaths || [],
    },
  }
}
