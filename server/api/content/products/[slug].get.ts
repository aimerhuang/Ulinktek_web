import { getProductBySlug } from '~/server/utils/cms'

export default defineEventHandler(async (event) => {
  const product = await getProductBySlug(useRuntimeConfig(event), getRouterParam(event, 'slug') || '')
  if (!product) throw createError({ statusCode: 404, statusMessage: '未找到产品' })
  return product
})
