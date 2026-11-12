import { getManualAsset, getPublishedManualFile } from '~/server/utils/cms'
export default defineEventHandler(async (event) => {
  const file = await getPublishedManualFile(useRuntimeConfig(event), getRouterParam(event, 'slug') || '')
  if (!file) throw createError({ statusCode: 404, statusMessage: '未找到说明书' })
  const asset = await getManualAsset(useRuntimeConfig(event), file.fileId)
  if (!asset) throw createError({ statusCode: 404, statusMessage: '未找到说明书文件' })
  setHeader(event, 'content-type', asset.headers.get('content-type') || 'application/octet-stream')
  setHeader(event, 'content-disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`)
  return new Uint8Array(await asset.arrayBuffer())
})
