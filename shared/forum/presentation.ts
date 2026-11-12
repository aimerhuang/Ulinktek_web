import { sanitizeRichHtml } from '../content/rich-html.ts'

function safeForumLink(value?: string) {
  const normalized = value?.trim()
  if (!normalized || normalized.includes('\\')) return undefined
  if (/^\/assets\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+(?:\?[A-Za-z0-9._~!$&'()*+,;=:@%/?-]*)?$/.test(normalized)) {
    return normalized
  }
  try {
    const url = new URL(normalized)
    return ['https:', 'mailto:', 'tel:'].includes(url.protocol) ? normalized : undefined
  } catch {
    return undefined
  }
}

export function sanitizeForumPostBody(value: string) {
  const normalizedHeadings = value.replace(/<(\/?)h1\b/gi, '<$1h2')
  return sanitizeRichHtml(normalizedHeadings, {
    linkUrl: safeForumLink,
    imageUrl: (src) => {
      const safeSrc = safeForumLink(src)
      return safeSrc && (/^https:\/\//i.test(safeSrc) || safeSrc.startsWith('/assets/')) ? safeSrc : undefined
    },
  })
}

export function formatForumDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(date)
}

export function forumPlainText(value: string) {
  return sanitizeForumPostBody(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function forumExcerpt(value: string, maximum = 150) {
  const text = forumPlainText(value)
  return text.length > maximum ? `${text.slice(0, maximum)}...` : text
}
