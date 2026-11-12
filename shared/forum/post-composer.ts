import { isManagedForumImageUrl, type ForumImage } from './contracts.ts'

export type ForumDraftImage = Pick<ForumImage, 'id' | 'url' | 'altText'>

const maxUploadBytes = 10 * 1024 * 1024
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateForumImageFile(file: Pick<File, 'name' | 'size' | 'type'>) {
  if (file.size <= 0) return '请选择有效的图片文件。'
  if (file.size > maxUploadBytes) return '单张图片不能超过 10 MiB。'
  if (!acceptedTypes.has(file.type)) return '仅支持 JPEG、PNG 和 WebP 图片。'
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  const matches = file.type === 'image/jpeg'
    ? extension === '.jpg' || extension === '.jpeg'
    : file.type === 'image/png'
      ? extension === '.png'
      : extension === '.webp'
  return matches ? '' : '图片扩展名与文件类型不一致。'
}

export function serializeForumPostDraft(text: string, images: ForumDraftImage[]) {
  const normalized = text.normalize('NFKC').trim()
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`)
  const imageBlocks = images.map((image) => {
    if (!isManagedForumImageUrl(image.url)) throw new Error('帖子包含无效的图片地址。')
    return `<p><img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.altText.trim())}"></p>`
  })
  return [...paragraphs, ...imageBlocks].join('')
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}
