import type { H3Event } from 'h3'
import type { RuntimeConfig } from 'nuxt/schema'
import { fetchPublicUpstream } from '~/server/utils/public-upstream'
import { parseForumPosts, parsePublicForumCategories, type ForumCategory, type ForumPost } from '~/shared/forum/contracts'
import { forumIndexPolicy, isForumPostIndexable } from '~/shared/forum/indexing'

function forumApiBase(config: RuntimeConfig) {
  const base = (config.siteApiServerBase || config.public.siteApiBase)?.replace(/\/+$/u, '')
  if (!base || !/^https?:\/\//iu.test(base)) {
    throw new Error('NUXT_SITE_API_SERVER_BASE is required to generate forum discovery output.')
  }
  return `${base}/forum`
}

export async function getIndexableForumContent(event: H3Event, config: RuntimeConfig): Promise<{ categories: ForumCategory[], posts: ForumPost[] }> {
  const base = forumApiBase(config)
  const [categoryPayload, firstPayload] = await Promise.all([
    fetchPublicUpstream<unknown>(event, `${base}/categories`),
    fetchPublicUpstream<unknown>(event, `${base}/posts?page=1&pageSize=100&keyword=`),
  ])
  const categories = parsePublicForumCategories(categoryPayload)
  const firstPage = parseForumPosts(firstPayload)
  const posts = [...firstPage.items]
  const pageCount = Math.ceil(firstPage.total / firstPage.pageSize)
  for (let page = 2; page <= pageCount; page += 1) {
    posts.push(...parseForumPosts(await fetchPublicUpstream<unknown>(event, `${base}/posts?page=${page}&pageSize=100&keyword=`)).items)
  }
  const policy = forumIndexPolicy(config.public)
  return { categories, posts: posts.filter(post => isForumPostIndexable(post, policy)) }
}
