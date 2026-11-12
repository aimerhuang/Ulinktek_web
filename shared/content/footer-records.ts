export type FooterRecordType = 'icp' | 'publicSecurity' | 'copyright'

const ICP_RECORD_URL = 'https://beian.miit.gov.cn/'
const PUBLIC_SECURITY_RECORD_URL = 'https://beian.mps.gov.cn/#/query/webSearch?code='
const PROVINCE_ABBREVIATIONS = '京津冀晋蒙辽吉黑沪苏浙皖闽赣鲁豫鄂湘粤桂琼渝川贵云藏陕甘青宁新'
const ICP_RECORD_PATTERN = new RegExp(`^[${PROVINCE_ABBREVIATIONS}]?ICP备\\s*[A-Z0-9-]+号(?:-\\d+)?$`, 'iu')
const PUBLIC_SECURITY_RECORD_PATTERN = new RegExp(`^[${PROVINCE_ABBREVIATIONS}]?公网安备\\s*(\\d{14})号?$`, 'u')

export function footerRecordHref(type: FooterRecordType, value: string): string | undefined {
  const text = value.trim()
  if (type === 'icp') return ICP_RECORD_PATTERN.test(text) ? ICP_RECORD_URL : undefined
  if (type === 'publicSecurity') {
    const code = text.match(PUBLIC_SECURITY_RECORD_PATTERN)?.[1]
    return code ? `${PUBLIC_SECURITY_RECORD_URL}${encodeURIComponent(code)}` : undefined
  }
  return undefined
}
