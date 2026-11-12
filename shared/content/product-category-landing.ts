import { isCanonicalProductCategorySlug } from './product-category'

export const selectionColumnKeys = ['model', 'camera', 'pipeDiameter', 'pushRodLength', 'resolution', 'scenario'] as const

export type SelectionColumnKey = typeof selectionColumnKeys[number]

export type ProductCategoryLandingCategory = {
  id: number
  name: string
  slug: string
  parentSlug?: string
}

export type ProductCategoryLandingColumn = {
  key: SelectionColumnKey
  label: string
  sortOrder: number
}

export type ProductCategorySelectionRow = {
  id: number
  sortOrder: number
  product?: {
    slug: string
    model: string
    title: string
  }
  cells: Record<SelectionColumnKey, string>
}

export type ProductCategorySelectionTable = {
  columns: ProductCategoryLandingColumn[]
  rows: ProductCategorySelectionRow[]
}

export type ProductCategoryFaq = {
  id: number
  sortOrder: number
  question: string
  answerHtml: string
  answerText: string
}

export type ProductCategoryLanding = {
  schemaVersion: 1
  category: ProductCategoryLandingCategory
  intro?: string
  selectionTable?: ProductCategorySelectionTable
  faqs: ProductCategoryFaq[]
  publishedAt?: string
}

type LandingDecoderOptions = {
  sanitizeAnswerHtml: (value: string) => string
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function plainAnswerText(value: unknown) {
  return text(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function finiteInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined
}

function decodeColumns(value: unknown): ProductCategoryLandingColumn[] {
  if (!Array.isArray(value) || value.length !== selectionColumnKeys.length) throw new Error('Product category landing returned invalid selection columns.')
  const columns = value.map((entry) => {
    const item = objectValue(entry)
    const key = text(item?.key) as SelectionColumnKey
    const label = text(item?.label)
    const sortOrder = finiteInteger(item?.sortOrder)
    if (!selectionColumnKeys.includes(key) || !label || !sortOrder || sortOrder < 1 || sortOrder > selectionColumnKeys.length) throw new Error('Product category landing returned invalid selection column.')
    return { key, label, sortOrder }
  })
  const keys = new Set(columns.map(column => column.key))
  const orders = new Set(columns.map(column => column.sortOrder))
  if (keys.size !== selectionColumnKeys.length || orders.size !== selectionColumnKeys.length) throw new Error('Product category landing returned duplicate selection columns.')
  return columns.sort((a, b) => a.sortOrder - b.sortOrder)
}

function decodeRows(value: unknown, options: LandingDecoderOptions): ProductCategorySelectionRow[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const item = objectValue(entry)
    const id = finiteInteger(item?.id)
    const sortOrder = finiteInteger(item?.sortOrder)
    const cellsValue = objectValue(item?.cells)
    if (!id || !sortOrder || sortOrder < 1 || !cellsValue) return []
    const cells = {} as Record<SelectionColumnKey, string>
    for (const key of selectionColumnKeys) cells[key] = text(cellsValue[key])
    const productValue = objectValue(item?.product)
    const productSlug = text(productValue?.slug)
    const productModel = text(productValue?.model)
    const productTitle = text(productValue?.title)
    const product = productSlug && isCanonicalProductCategorySlug(productSlug) && productModel && productTitle
      ? { slug: productSlug, model: productModel, title: productTitle }
      : undefined
    return [{ id, sortOrder, product, cells }]
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
}

function decodeFaqs(value: unknown, options: LandingDecoderOptions): ProductCategoryFaq[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const item = objectValue(entry)
    const id = finiteInteger(item?.id)
    const sortOrder = finiteInteger(item?.sortOrder)
    const question = text(item?.question)
    const rawAnswerHtml = text(item?.answerHtml)
    const answerHtml = rawAnswerHtml ? options.sanitizeAnswerHtml(rawAnswerHtml) : ''
    const answerText = plainAnswerText(item?.answerText)
    if (!id || !sortOrder || sortOrder < 1 || !question || !answerHtml || !answerText) return []
    return [{ id, sortOrder, question, answerHtml, answerText }]
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
}

export function decodeProductCategoryLanding(value: unknown, options: LandingDecoderOptions = { sanitizeAnswerHtml: value => value }): ProductCategoryLanding {
  const source = objectValue(value)
  if (source?.schemaVersion !== 1) throw new Error('Product category landing returned an unsupported schema version.')
  const categoryValue = objectValue(source.category)
  const id = finiteInteger(categoryValue?.id)
  const name = text(categoryValue?.name)
  const slug = text(categoryValue?.slug)
  if (!id || !name || !slug) throw new Error('Product category landing returned an invalid category.')
  const parentSlug = text(categoryValue?.parentSlug)

  let selectionTable: ProductCategorySelectionTable | undefined
  const tableValue = objectValue(source.selectionTable)
  if (tableValue) {
    const columns = decodeColumns(tableValue.columns)
    const rows = decodeRows(tableValue.rows, options)
    if (rows.length) selectionTable = { columns, rows }
  }

  const intro = text(source.intro)
  if (intro && (Array.from(intro).length > 200 || /[<>]/u.test(intro) || /[\u0000-\u001f\u007f]/u.test(intro))) throw new Error('Product category landing returned invalid intro text.')
  return {
    schemaVersion: 1,
    category: {
      id,
      name,
      slug,
      ...(parentSlug ? { parentSlug } : {}),
    },
    ...(intro ? { intro: Array.from(intro).slice(0, 200).join('') } : {}),
    ...(selectionTable ? { selectionTable } : {}),
    faqs: decodeFaqs(source.faqs, options),
    ...(text(source.publishedAt) ? { publishedAt: text(source.publishedAt) } : {}),
  }
}
