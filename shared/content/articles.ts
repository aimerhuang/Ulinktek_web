import type { ArticleSchemaType } from './media-publication'
import type { ArticleSeo } from './article-metadata'
import type { KnowledgeCategoryRef } from './knowledge-categories'

export type Article = {
  slug: string
  type: string
  category?: KnowledgeCategoryRef
  title: string
  excerpt: string
  body: string
  bodyHtml?: string
  author?: string
  publishedAt?: string
  updatedAt?: string
  coverImageUrl?: string
  imageUrls: string[]
  videoUrl?: string
  customSlug?: string
  sourceUrl?: string
  schemaType?: ArticleSchemaType
  tags: string[]
  seo: ArticleSeo
}

// Directus 未配置时的本地开发兜底。正式内容请在 Directus 的 articles 集合中维护。
export const articles: Article[] = []
