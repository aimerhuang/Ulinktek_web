import { isCanonicalProductCategorySlug } from './product-category.ts'

export type ProductCategorySourceNode = {
  id?: number | null
  name?: string | null
  slug?: string | null
  children?: ProductCategorySourceNode[] | null
}

export type ProductCategory = {
  id: number
  name: string
  slug: string
  parentId?: number
  parentSlug?: string
  descendantIds: number[]
  descendantSlugs: string[]
}

export type ProductCategoryEntry = ProductCategory & {
  productCount: number
}

export function projectProductCategoryTree(nodes: ProductCategorySourceNode[]): ProductCategory[] {
  const categories: ProductCategory[] = []
  const ids = new Set<number>()
  const slugs = new Set<string>()

  function visit(entries: ProductCategorySourceNode[], parent?: ProductCategory): ProductCategory[] {
    const projected: ProductCategory[] = []
    for (const node of entries) {
      const id = node.id
      const name = node.name?.trim()
      const slug = node.slug?.trim()
      if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0 || !name || !isCanonicalProductCategorySlug(slug)) {
        if (node.children?.length) projected.push(...visit(node.children, parent))
        continue
      }
      if (ids.has(id) || slugs.has(slug)) throw new Error('Published product categories contain a duplicate id or slug.')

      ids.add(id)
      slugs.add(slug)
      const category: ProductCategory = {
        id,
        name,
        slug,
        parentId: parent?.id,
        parentSlug: parent?.slug,
        descendantIds: [],
        descendantSlugs: [],
      }
      categories.push(category)
      projected.push(category)

      const descendants = node.children?.length ? visit(node.children, category) : []
      category.descendantIds = descendants.flatMap(child => [child.id, ...child.descendantIds])
      category.descendantSlugs = descendants.flatMap(child => [child.slug, ...child.descendantSlugs])
    }
    return projected
  }

  visit(nodes)
  return categories
}

export function productsInProductCategory<T extends { slug: string, categorySlug: string }>(products: T[], category: ProductCategory): T[] {
  const memberSlugs = new Set([category.slug, ...category.descendantSlugs])
  return [...new Map(products
    .filter(product => memberSlugs.has(product.categorySlug))
    .map(product => [product.slug, product])).values()]
}

export function nonemptyProductCategoryEntries<T extends { slug: string, categorySlug: string }>(categories: ProductCategory[], products: T[]): ProductCategoryEntry[] {
  return categories.flatMap((category) => {
    const productCount = productsInProductCategory(products, category).length
    return productCount ? [{ ...category, productCount }] : []
  })
}
