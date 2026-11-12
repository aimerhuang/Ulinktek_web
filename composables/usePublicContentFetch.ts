import { createError, setResponseHeader } from 'h3'
import { classifyPublicContentFetchError, publicContentFetchOptions } from '~/shared/content/upstream'

export function usePublicContentFetch() {
  const config = useRuntimeConfig()
  const event = import.meta.server ? useRequestEvent() : undefined
  const fetchOptions = import.meta.server
    ? publicContentFetchOptions({
        includeTrustedSsrHeader: true,
        trustedSsrApiKey: config.trustedSsrApiKey,
        timeoutSeconds: config.contentApiTimeoutSeconds,
      })
    : publicContentFetchOptions({ includeTrustedSsrHeader: false })

  return async function publicContentFetch<T>(url: string): Promise<T> {
    try {
      return await $fetch<T>(url, fetchOptions) as T
    } catch (error: unknown) {
      if (import.meta.server) {
        const failure = classifyPublicContentFetchError(error)
        if (failure.kind === 'unavailable') {
          if (event) setResponseHeader(event, 'retry-after', failure.retryAfterSeconds)
          throw createError({
            statusCode: 503,
            statusMessage: 'Published content is temporarily unavailable.',
            data: { retryAfterSeconds: failure.retryAfterSeconds },
          })
        }
      }
      throw error
    }
  }
}
