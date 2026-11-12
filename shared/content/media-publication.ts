export type ArticleSchemaType = 'Article' | 'NewsArticle'

export function mediaTypeLabel(type?: string | null) {
  if (type === 'engineering_case') return '工程案例'
  if (type === 'experience_share') return '经验分享'
  if (type === 'company_news') return '公司动态'
  if (type === 'media_report') return '媒体报道'
  if (type?.includes('video')) return '产品视频'
  return type?.trim() || '媒体动态'
}

export function articleSchemaType(type?: string | null): ArticleSchemaType {
  return ['company_news', 'media_report', '公司动态', '媒体报道', '新闻'].includes(type?.trim() || '')
    ? 'NewsArticle'
    : 'Article'
}
