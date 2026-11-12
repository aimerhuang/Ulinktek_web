import { createError, setResponseHeader, type H3Event } from 'h3'
import { classifyPublicContentFetchError, publicContentFetchOptions } from '~/shared/content/upstream'

export async function fetchPublicUpstream<T>(event: H3Event, url: string): Promise<T> {
  const config = useRuntimeConfig(event)
  try {
    return await $fetch<T>(url, publicContentFetchOptions({
      includeTrustedSsrHeader: true,
      trustedSsrApiKey: config.trustedSsrApiKey,
      timeoutSeconds: config.contentApiTimeoutSeconds,
    })) as T
  } catch (error: unknown) {
    const failure = classifyPublicContentFetchError(error)
    if (failure.kind === 'preserve') throw error
    setResponseHeader(event, 'retry-after', failure.retryAfterSeconds)
    throw createError({
      statusCode: 503,
      statusMessage: 'Published content is temporarily unavailable.',
      data: { retryAfterSeconds: failure.retryAfterSeconds },
    })
  }
}
