import { getArticleBySlug } from '~/server/utils/cms'

export default defineEventHandler(async (event) => {
  const article = await getArticleBySlug(useRuntimeConfig(event), getRouterParam(event, 'slug') || '')
  if (!article) throw createError({ statusCode: 404, statusMessage: '未找到文章' })
  return article
})
