const canonicalSpecificationCode = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function specificationEntries(value: unknown): Array<[unknown, unknown]> {
  if (typeof value === 'string') {
    try {
      return specificationEntries(JSON.parse(value))
    } catch {
      return []
    }
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
      const specification = entry as { code?: unknown, value?: unknown }
      return [[specification.code, specification.value]]
    })
  }
  if (!value || typeof value !== 'object') return []
  return Object.entries(value)
}

export function decodeProductSpecificationValues(value: unknown): Record<string, string> {
  return Object.fromEntries(specificationEntries(value).flatMap(([rawCode, rawValue]) => {
    if (typeof rawCode !== 'string' || typeof rawValue !== 'string') return []
    const code = rawCode.normalize('NFKC').trim().toLowerCase()
    const specificationValue = rawValue.trim()
    return canonicalSpecificationCode.test(code) && specificationValue ? [[code, specificationValue]] : []
  }))
}
