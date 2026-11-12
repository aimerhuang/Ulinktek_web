import aliases from './product-slug-redirects.json'

const productSlugAliases: Readonly<Record<string, string>> = aliases

export function resolveProductSlug(value: string) {
  const slug = value.normalize('NFKC').trim().toLowerCase()
  return productSlugAliases[slug] || slug
}

export { productSlugAliases }
