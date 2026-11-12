import { setResponseHeader } from 'h3'

type RetryableError = Error & {
  data?: unknown
}

function retryAfterSeconds(error: RetryableError): number | undefined {
  if (!error.data || typeof error.data !== 'object' || !('retryAfterSeconds' in error.data)) return undefined
  const value = (error.data as { retryAfterSeconds?: unknown }).retryAfterSeconds
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 3600
    ? value
    : undefined
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, context) => {
    const retryAfter = retryAfterSeconds(error as RetryableError)
    if (!context.event || retryAfter === undefined) return
    setResponseHeader(context.event, 'retry-after', retryAfter)
    ;(error as RetryableError).data = undefined
  })
})
