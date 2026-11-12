export type Faq = {
  slug: string
  question: string
  answer: string
  category: string
  productSlug?: string
  publishedAt?: string
}

export const faqs: Faq[] = []
