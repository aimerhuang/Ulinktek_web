import { decodePublicLegalDocument, type LegalDocumentType, type PublicLegalDocument } from '~/shared/content/legal-documents'

type LegalDocumentStatus = 'idle' | 'loading' | 'configured' | 'unconfigured' | 'error'

type LegalDocumentState = {
  status: LegalDocumentStatus
  document?: PublicLegalDocument
  error: string
}

function statusCode(error: unknown) {
  if (!error || typeof error !== 'object') return undefined
  const candidate = error as { status?: number, statusCode?: number }
  return candidate.statusCode ?? candidate.status
}

export function useLegalDocument(type: LegalDocumentType) {
  const siteApiUrl = useSiteApiUrl()
  const publicContentFetch = usePublicContentFetch()
  const state = useState<LegalDocumentState>(`legal-document:${type}`, () => ({ status: 'idle', error: '' }))

  async function load() {
    if (import.meta.server || state.value.status === 'loading') return
    state.value = { status: 'loading', error: '' }
    try {
      const response = await publicContentFetch<unknown>(siteApiUrl(`legal-documents/${type}`))
      state.value = { status: 'configured', document: decodePublicLegalDocument(response, type), error: '' }
    } catch (error) {
      state.value = statusCode(error) === 404
        ? { status: 'unconfigured', error: '' }
        : { status: 'error', error: '网站说明暂时无法加载，请稍后重试。' }
    }
  }

  return { state, load }
}
