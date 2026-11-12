import { buildRobotsTxt } from '~/shared/content/discovery'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return buildRobotsTxt(config.public.siteUrl)
})
