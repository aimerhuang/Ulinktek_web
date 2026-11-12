import { absoluteSiteUrl, organizationEntityId, websiteEntityId } from '~/shared/content/structured-data'

export type ApiCertificateProduct = { name?: string | null, modelNo?: string | null, slug?: string | null }
export type ApiCertificate = {
  id?: number | null
  title?: string | null
  type?: string | null
  certificateNumber?: string | null
  issuer?: string | null
  issuedAt?: string | null
  expiresAt?: string | null
  scope?: string | null
  imageUrl?: string | null
  isFeatured?: boolean | null
  products?: ApiCertificateProduct[] | null
}

export type CertificateType = 'company_qualification' | 'management_system' | 'product_compliance' | 'patent'
export type CertificateProduct = { name: string, modelNo?: string, slug?: string }
export type Certificate = {
  id: string
  title: string
  imageUrl: string
  type?: CertificateType
  typeLabel?: string
  coverageNote?: string
  certificateNumber?: string
  issuer?: string
  issuedAt?: string
  expiresAt?: string
  scope?: string
  products: CertificateProduct[]
}

const certificateTypeLabels: Record<CertificateType, string> = {
  company_qualification: '企业资质',
  management_system: '管理体系认证',
  product_compliance: '产品合规认证',
  patent: '专利',
}

// Keeps company-level certificates from being read as covering every product model.
const certificateCoverageNotes: Partial<Record<CertificateType, string>> = {
  company_qualification: '企业主体资质，不代表具体产品型号的认证。',
  management_system: '企业管理体系认证，不等同于产品认证。',
  product_compliance: '仅适用于证书所列型号与配置。',
}

const datePattern = /^(\d{4}-\d{2}-\d{2})/
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function text(value?: string | null) {
  return value?.trim() || undefined
}

/** Returns the calendar date of a backend timestamp without shifting it through the server time zone. */
export function certificateDate(value?: string | null) {
  return value?.trim().match(datePattern)?.[1]
}

export function isCertificateExpired(certificate: Pick<Certificate, 'expiresAt'>, today = new Date().toISOString().slice(0, 10)) {
  return Boolean(certificate.expiresAt && certificate.expiresAt < today)
}

function isCertificateType(value?: string): value is CertificateType {
  return Boolean(value && Object.hasOwn(certificateTypeLabels, value))
}

function projectProduct(product: ApiCertificateProduct): CertificateProduct[] {
  const name = text(product.name)
  if (!name) return []
  const slug = text(product.slug)?.toLowerCase()
  return [{ name, modelNo: text(product.modelNo), slug: slug && slug.length <= 200 && slugPattern.test(slug) ? slug : undefined }]
}

export function projectCertificate(
  entry: ApiCertificate,
  index: number,
  resolveImageUrl: (path?: string | null) => string | undefined,
): Certificate | undefined {
  const title = text(entry.title)
  const imageUrl = resolveImageUrl(entry.imageUrl)
  if (!title || !imageUrl) return undefined
  const type = text(entry.type)
  const knownType = isCertificateType(type) ? type : undefined
  return {
    id: String(entry.id ?? `certificate-${index}`),
    title,
    imageUrl,
    type: knownType,
    typeLabel: knownType ? certificateTypeLabels[knownType] : undefined,
    coverageNote: knownType ? certificateCoverageNotes[knownType] : undefined,
    certificateNumber: text(entry.certificateNumber),
    issuer: text(entry.issuer),
    issuedAt: certificateDate(entry.issuedAt),
    expiresAt: certificateDate(entry.expiresAt),
    scope: text(entry.scope),
    products: Array.isArray(entry.products) ? entry.products.flatMap(projectProduct) : [],
  }
}

function absoluteUrlOrUndefined(siteUrl: string, value: string) {
  try {
    return absoluteSiteUrl(siteUrl, value)
  }
  catch {
    return undefined
  }
}

/**
 * Machine-readable certificate facts for crawlers; the visible page intentionally shows only the image and title.
 * Company-level certificates point at the organization, product certificates at the listed product models.
 */
export function certificateCollectionEntity(
  siteUrl: string,
  pagePath: string,
  pageName: string,
  certificates: Certificate[],
  today = new Date().toISOString().slice(0, 10),
) {
  const pageUrl = absoluteSiteUrl(siteUrl, pagePath)
  const organization = { '@id': organizationEntityId(siteUrl) }
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': pageUrl,
    url: pageUrl,
    name: pageName,
    isPartOf: { '@id': websiteEntityId(siteUrl) },
    about: organization,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: certificates.length,
      itemListElement: certificates.map((certificate, index) => {
        const image = absoluteUrlOrUndefined(siteUrl, certificate.imageUrl)
        const products = certificate.products.map(product => ({
          '@type': 'Product',
          name: product.name,
          ...(product.modelNo ? { model: product.modelNo } : {}),
          ...(product.slug ? { url: absoluteSiteUrl(siteUrl, `/zh/products/${product.slug}`) } : {}),
        }))
        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Certification',
            '@id': `${pageUrl}#certificate-${certificate.id}`,
            name: certificate.title,
            ...(certificate.typeLabel ? { category: certificate.typeLabel } : {}),
            ...(certificate.certificateNumber ? { certificationIdentification: certificate.certificateNumber } : {}),
            ...(certificate.issuer ? { issuedBy: { '@type': 'Organization', name: certificate.issuer } } : {}),
            ...(certificate.issuedAt ? { validFrom: certificate.issuedAt } : {}),
            ...(certificate.expiresAt ? { expires: certificate.expiresAt } : {}),
            certificationStatus: isCertificateExpired(certificate, today)
              ? 'https://schema.org/CertificationInactive'
              : 'https://schema.org/CertificationActive',
            ...(certificate.scope ? { description: certificate.scope } : {}),
            ...(certificate.coverageNote ? { disambiguatingDescription: certificate.coverageNote } : {}),
            ...(image ? { image } : {}),
            about: products.length ? products : organization,
          },
        }
      }),
    },
  }
}
