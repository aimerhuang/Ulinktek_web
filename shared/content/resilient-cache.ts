export type ResilientCacheOptions = {
  maxAgeMs: number
  retryDelayMs: number
  now?: () => number
  shouldUseStale?: (error: unknown) => boolean
}

export type ResilientCache<T> = {
  get: (load: () => Promise<T>) => Promise<T>
}

export function createResilientCache<T>(options: ResilientCacheOptions): ResilientCache<T> {
  const now = options.now || Date.now
  let snapshot: { value: T, freshUntil: number } | undefined
  let retryAt = 0
  let inFlight: Promise<T> | undefined

  function get(load: () => Promise<T>): Promise<T> {
    const currentTime = now()
    if (snapshot && (currentTime < snapshot.freshUntil || currentTime < retryAt)) {
      return Promise.resolve(snapshot.value)
    }
    if (inFlight) return inFlight

    const refresh = Promise.resolve()
      .then(load)
      .then((value) => {
        snapshot = { value, freshUntil: now() + options.maxAgeMs }
        retryAt = 0
        return value
      }, (error: unknown) => {
        if (!snapshot || (options.shouldUseStale && !options.shouldUseStale(error))) throw error
        retryAt = now() + options.retryDelayMs
        return snapshot.value
      })
      .finally(() => {
        if (inFlight === refresh) inFlight = undefined
      })

    inFlight = refresh
    return refresh
  }

  return { get }
}
