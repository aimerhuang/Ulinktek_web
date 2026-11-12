import type { ForumErrorDetail } from './contracts.ts'

export class ForumApiError extends Error {
  status: number
  code: string
  details: ForumErrorDetail[]
  retryAfterSeconds?: number
  traceId?: string

  constructor(
    status: number,
    code: string,
    message: string,
    details: ForumErrorDetail[] = [],
    retryAfterSeconds?: number,
    traceId?: string,
  ) {
    super(message)
    this.name = 'ForumApiError'
    this.status = status
    this.code = code
    this.details = details
    this.retryAfterSeconds = retryAfterSeconds
    this.traceId = traceId
  }
}

export function fallbackForumCode(status: number) {
  if (status === 400) return 'VALIDATION_ERROR'
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 429) return 'RATE_LIMITED'
  return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'
}

export function forumRetryAfterSeconds(value: string | null) {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - Date.now()) / 1000)) : undefined
}
