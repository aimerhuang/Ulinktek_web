type RichHtmlSanitizerOptions = {
  linkUrl: (value?: string) => string | undefined
  imageUrl: (value?: string) => string | undefined
  videoUrl?: (value?: string) => string | undefined
  // Receives the cleaned alt and the 1-based position of the image in the document.
  imageAlt?: (alt: string, position: number) => string
}

// CMS uploads derive alt text from file names: de-dup suffixes ("…原因-vddstf", "现场作业图 91afd379")
// and camera/chat-app names ("QQ20260827 143854", "微信图片 2026…") carry no meaning for readers or search.
// Content is Chinese, so an alt with no Chinese at all is a bare file name ("3188DH 2", "5D3", "01 main").
const uploadSuffix = /(?:(?<=[^\x00-\x7f])-[a-z]{6}|\s[0-9a-f]{8})$/u
const fileNameAlt = /^(?:微信图片|qq\d|img[_\s-]?\d|dsc[_\s-]?\d|image\s[0-9a-f]{8}|截图|屏幕截图|screenshot)/iu
const chineseText = /\p{Script=Han}/u

export function readableImageAlt(alt: string, fallback: string) {
  const cleaned = alt.replace(uploadSuffix, '').trim()
  const meaningless = !chineseText.test(cleaned) || /\d{8,}/u.test(cleaned) || fileNameAlt.test(cleaned)
  return meaningless ? fallback : cleaned
}

const allowedTags = new Set([
  'a', 'b', 'blockquote', 'br', 'caption', 'code', 'col', 'colgroup', 'del', 'div', 'em', 'figure', 'video', 'source',
  'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre',
  'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
])

function attribute(input: string, name: string) {
  return input.match(new RegExp(`\\b${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(1).find(Boolean)?.trim()
}

function cleanText(input: string) {
  return input.replace(/<[^>]*>/g, '').replace(/["<>]/g, '').trim()
}

function escapeAttribute(input: string) {
  return input.replace(/"/g, '&quot;')
}

function spanAttribute(attributes: string, name: 'colspan' | 'rowspan' | 'span') {
  const value = attribute(attributes, name)
  if (!value || !/^\d{1,3}$/.test(value)) return ''
  const count = Number(value)
  return count >= 1 ? ` ${name}="${count}"` : ''
}

function widthAttribute(attributes: string) {
  const explicitWidth = attribute(attributes, 'width')
  const styleWidth = attribute(attributes, 'style')?.match(/(?:^|;)\s*width\s*:\s*([^;]+)/i)?.[1]?.trim()
  const width = explicitWidth || styleWidth
  if (!width || !/^\d+(?:\.\d+)?(?:%|px|em|rem|ch)?$/i.test(width)) return ''
  return ` width="${width}"`
}

export function sanitizeRichHtml(value: string, options: RichHtmlSanitizerOptions) {
  const blocked = value.replace(/<(script|style|iframe|object|embed|form|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  let imagePosition = 0
  const usedImageAlts = new Set<string>()

  return blocked.replace(/<\s*(\/)?\s*([a-z0-9]+)([^>]*)>/gi, (_match, closing: string | undefined, tag: string, attributes: string) => {
    const normalizedTag = tag.toLowerCase()
    if (!allowedTags.has(normalizedTag)) return ''
    const outputTag = normalizedTag === 'h1' ? 'h2' : normalizedTag
    if (closing) return outputTag === 'table' ? '</table></div>' : `</${outputTag}>`
    if (outputTag === 'table') return '<div class="rich-table"><table>'
    if (outputTag === 'a') {
      const href = options.linkUrl(attribute(attributes, 'href'))
      return href ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">` : '<a>'
    }
    if (outputTag === 'img') {
      const src = options.imageUrl(attribute(attributes, 'src'))
      if (!src) return ''
      imagePosition += 1
      const sourceAlt = cleanText(attribute(attributes, 'alt') || '')
      let alt = options.imageAlt ? cleanText(options.imageAlt(sourceAlt, imagePosition)) : sourceAlt
      // Cleaned upload names often collapse to one text; keep each image distinguishable.
      if (options.imageAlt && alt && usedImageAlts.has(alt)) alt = `${alt}（图 ${imagePosition}）`
      usedImageAlts.add(alt)
      return `<img src="${escapeAttribute(src)}" alt="${alt}">`
    }
    if (outputTag === 'video') {
      if (!options.videoUrl) return ''
      const poster = options.imageUrl(attribute(attributes, 'poster'))
      const src = options.videoUrl(attribute(attributes, 'src'))
      const title = cleanText(attribute(attributes, 'title') || '')
      return `<video controls preload="metadata"${src ? ` src="${escapeAttribute(src)}"` : ''}${poster ? ` poster="${escapeAttribute(poster)}"` : ''}${title ? ` title="${escapeAttribute(title)}"` : ''}>`
    }
    if (outputTag === 'source') {
      const src = options.videoUrl?.(attribute(attributes, 'src'))
      return src ? `<source src="${escapeAttribute(src)}">` : ''
    }
    if (outputTag === 'th') {
      const scope = attribute(attributes, 'scope')?.toLowerCase()
      const safeScope = scope && ['col', 'row', 'colgroup', 'rowgroup'].includes(scope) ? ` scope="${scope}"` : ''
      return `<th${safeScope}${spanAttribute(attributes, 'colspan')}${spanAttribute(attributes, 'rowspan')}${widthAttribute(attributes)}>`
    }
    if (outputTag === 'td') {
      return `<td${spanAttribute(attributes, 'colspan')}${spanAttribute(attributes, 'rowspan')}${widthAttribute(attributes)}>`
    }
    if (outputTag === 'col') return `<col${spanAttribute(attributes, 'span')}${widthAttribute(attributes)}>`
    return `<${outputTag}>`
  })
}
