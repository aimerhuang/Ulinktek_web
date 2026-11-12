import type { ForumApiError } from './api-error.ts'

const DEFAULT_RETRY_AFTER_SECONDS = 60

export type ForumSsrFailure =
  | { statusCode: 404 }
  | { statusCode: 500 }
  | { statusCode: 503, retryAfterSeconds: number }

// Timeouts, 429 and 5xx never reach this: usePublicContentFetch already turns them into Nuxt 503s during SSR.
// Everything that does reach it must leave SSR as a real error status, never as a 200 page with an inline error.
export function forumSsrFailure(error: Pick<ForumApiError, 'status' | 'code' | 'retryAfterSeconds'>): ForumSsrFailure {
  if (error.status === 400 || error.status === 404 || error.status === 422) return { statusCode: 404 }
  // A malformed successful DTO is an application error, not upstream unavailability.
  if (error.code === 'INVALID_RESPONSE') return { statusCode: 500 }
  const retryAfterSeconds = error.retryAfterSeconds && error.retryAfterSeconds > 0
    ? error.retryAfterSeconds
    : DEFAULT_RETRY_AFTER_SECONDS
  return { statusCode: 503, retryAfterSeconds }
}
