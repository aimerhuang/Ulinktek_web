import { sanitizeRichHtml } from './rich-html.ts'

export const LEGAL_DOCUMENT_TYPES = ['terms', 'privacy'] as const

export type LegalDocumentType = typeof LEGAL_DOCUMENT_TYPES[number]

export type PublicLegalDocument = {
  type: LegalDocumentType
  title: string
  contentHtml: string
  updatedAt: string
}

const titles: Record<LegalDocumentType, string> = {
  terms: '用户协议',
  privacy: '隐私政策',
}

function invalid(): never {
  throw new Error('Public site API returned an invalid legal document response.')
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  return value as Record<string, unknown>
}

function requiredString(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) invalid()
  return value.trim()
}

function timestamp(value: unknown) {
  const normalized = requiredString(value)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(normalized) || !Number.isFinite(Date.parse(normalized))) invalid()
  return normalized
}

function safeLink(value?: string) {
  const normalized = value?.trim()
  if (!normalized) return undefined
  if (/^(https:\/\/|mailto:|tel:)/i.test(normalized)) return normalized
  return /^\/assets\//.test(normalized) && !normalized.includes('\\') ? normalized : undefined
}

export function sanitizeLegalDocumentHtml(value: string) {
  return sanitizeRichHtml(value, {
    linkUrl: safeLink,
    imageUrl: (src) => {
      const safeSrc = safeLink(src)
      return safeSrc && /^(https:\/\/|\/assets\/)/i.test(safeSrc) ? safeSrc : undefined
    },
  })
}

export function decodePublicLegalDocument(value: unknown, expectedType: LegalDocumentType): PublicLegalDocument {
  const source = record(value)
  if (source.type !== expectedType || source.title !== titles[expectedType]) invalid()
  const contentHtml = sanitizeLegalDocumentHtml(requiredString(source.content))
  if (!contentHtml.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').trim()) invalid()
  return {
    type: expectedType,
    title: titles[expectedType],
    contentHtml,
    updatedAt: timestamp(source.updatedAt),
  }
}
