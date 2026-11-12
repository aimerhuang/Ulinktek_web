export type ContactMapCandidate = {
  mapProvider?: unknown
  longitude?: unknown
  latitude?: unknown
  companyName?: unknown
  address?: unknown
}

export type AmapLocation = {
  provider: 'amap'
  longitude: number
  latitude: number
  companyName: string
  address: string
}

function trimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function decodeAmapLocation(candidate: ContactMapCandidate): AmapLocation | undefined {
  const provider = trimmedString(candidate.mapProvider).toLowerCase()
  const longitude = candidate.longitude
  const latitude = candidate.latitude

  if (provider !== 'amap' ||
      typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return undefined
  }

  return {
    provider: 'amap',
    longitude,
    latitude,
    companyName: trimmedString(candidate.companyName),
    address: trimmedString(candidate.address),
  }
}

export function buildAmapNavigationUrl(location: AmapLocation) {
  const url = new URL('https://uri.amap.com/navigation')
  url.searchParams.set('to', `${location.longitude},${location.latitude},${location.companyName}`)
  url.searchParams.set('mode', 'car')
  url.searchParams.set('coordinate', 'gaode')
  url.searchParams.set('callnative', '1')
  url.searchParams.set('src', 'ulinktek-website')
  return url.toString()
}
