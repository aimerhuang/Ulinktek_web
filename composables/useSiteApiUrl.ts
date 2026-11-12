function trimSiteApiTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function useSiteApiUrl() {
  const config = useRuntimeConfig()
  const apiBase = trimSiteApiTrailingSlash((import.meta.server ? config.siteApiServerBase : config.public.siteApiBase) || config.public.siteApiBase || '/api/public')

  return (path: string) => `${apiBase}/${path.replace(/^\/+/, '')}`
}
