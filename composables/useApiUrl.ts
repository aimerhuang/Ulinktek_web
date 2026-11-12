function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function useApiUrl() {
  const config = useRuntimeConfig()
  const apiBase = trimTrailingSlash((import.meta.server ? config.apiServerBase : config.public.apiBase) || config.public.apiBase || '/api')

  return (path: string) => `${apiBase}/${path.replace(/^\/+/, '')}`
}
