const DEFAULT_CONTENT_API_TIMEOUT_SECONDS = 8
const MIN_CONTENT_API_TIMEOUT_SECONDS = 1
const MAX_CONTENT_API_TIMEOUT_SECONDS = 30
const DEFAULT_RETRY_AFTER_SECONDS = 60
const MAX_RETRY_AFTER_SECONDS = 3600

export const TRUSTED_SSR_HEADER = 'X-Ulink-SSR-Key'

type PublicContentFetchOptionsInput = {
  includeTrustedSsrHeader: boolean
  trustedSsrApiKey?: string
  timeoutSeconds?: unknown
}

type ResponseHeaders = Headers | Record<string, unknown> | { get(name: string): string | null }

type FetchErrorLike = {
  status?: number
  statusCode?: number
  response?: {
    status?: number
    headers?: ResponseHeaders
  }
}

export type PublicContentFetchErrorClassification =
  | { kind: 'preserve' }
  | { kind: 'unavailable', retryAfterSeconds: number }

export function normalizeContentApiTimeoutSeconds(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_CONTENT_API_TIMEOUT_SECONDS
  return Math.min(MAX_CONTENT_API_TIMEOUT_SECONDS, Math.max(MIN_CONTENT_API_TIMEOUT_SECONDS, parsed))
}

export function publicContentFetchOptions(input: PublicContentFetchOptionsInput) {
  const timeoutSeconds = normalizeContentApiTimeoutSeconds(input.timeoutSeconds)
  const trustedSsrApiKey = typeof input.trustedSsrApiKey === 'string' && input.trustedSsrApiKey.trim().length > 0
    ? input.trustedSsrApiKey
    : undefined

  return {
    retry: 0 as const,
    timeout: timeoutSeconds * 1000,
    headers: input.includeTrustedSsrHeader && trustedSsrApiKey
      ? { [TRUSTED_SSR_HEADER]: trustedSsrApiKey }
      : undefined,
  }
}

function statusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as FetchErrorLike
  const value = candidate.response?.status ?? candidate.statusCode ?? candidate.status
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined
}

function retryAfterHeader(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const headers = (error as FetchErrorLike).response?.headers
  if (!headers) return undefined
  if ('get' in headers && typeof headers.get === 'function') {
    return headers.get('retry-after') ?? undefined
  }

  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'retry-after' && typeof value === 'string') return value
  }
  return undefined
}

function safeRetryAfterSeconds(value: string | undefined, now = Date.now()): number {
  const normalized = value?.trim()
  if (!normalized) return DEFAULT_RETRY_AFTER_SECONDS
  if (/^\d+$/.test(normalized)) {
    const seconds = Number(normalized)
    return seconds >= 1 && seconds <= MAX_RETRY_AFTER_SECONDS ? seconds : DEFAULT_RETRY_AFTER_SECONDS
  }

  const retryAt = Date.parse(normalized)
  if (!Number.isFinite(retryAt)) return DEFAULT_RETRY_AFTER_SECONDS
  const seconds = Math.ceil((retryAt - now) / 1000)
  return seconds >= 1 && seconds <= MAX_RETRY_AFTER_SECONDS ? seconds : DEFAULT_RETRY_AFTER_SECONDS
}

export function classifyPublicContentFetchError(error: unknown): PublicContentFetchErrorClassification {
  const status = statusCode(error)
  if (status === undefined) {
    return { kind: 'unavailable', retryAfterSeconds: DEFAULT_RETRY_AFTER_SECONDS }
  }
  if (status !== 429 && status !== 500 && status !== 502 && status !== 503 && status !== 504) {
    return { kind: 'preserve' }
  }
  return {
    kind: 'unavailable',
    retryAfterSeconds: safeRetryAfterSeconds(retryAfterHeader(error)),
  }
}
