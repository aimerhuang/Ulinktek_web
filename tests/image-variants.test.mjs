import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  IMAGE_CARD_WIDTHS,
  IMAGE_DETAIL_WIDTHS,
  trustedImageSrcset,
  trustedImageVariant,
} from '../shared/content/image-variants.ts'

const siteUrl = 'https://www.szulink.com.cn'
const key = '0123456789abcdef0123456789abcdef.jpg'
const shopify = 'https://cn.ulinktek.com/cdn/shop/files/probe.jpg?v=1700000000'

test('relative managed images get ?w= variants', () => {
  assert.equal(trustedImageVariant(`/assets/managed/${key}`, 320, siteUrl), `/assets/managed/${key}?w=320`)
  assert.equal(trustedImageVariant(`/assets/managed/${key}`, 1440), `/assets/managed/${key}?w=1440`)
})

test('managed images on the site origin keep their absolute URL', () => {
  assert.equal(
    trustedImageVariant(`${siteUrl}/assets/managed/${key}`, 600, siteUrl),
    `${siteUrl}/assets/managed/${key}?w=600`,
  )
  assert.equal(
    trustedImageVariant(`${siteUrl}/assets/managed/${key}`, 600, `${siteUrl}/`),
    `${siteUrl}/assets/managed/${key}?w=600`,
  )
})

test('managed paths on other origins, or without a site URL, are rejected', () => {
  for (const value of [
    `https://evil.example.com/assets/managed/${key}`,
    `http://www.szulink.com.cn/assets/managed/${key}`,
    `https://www.szulink.com.cn:8443/assets/managed/${key}`,
    `https://user:pass@www.szulink.com.cn/assets/managed/${key}`,
    `//www.szulink.com.cn/assets/managed/${key}`,
  ]) assert.equal(trustedImageVariant(value, 600, siteUrl), undefined, value)
  assert.equal(trustedImageVariant(`${siteUrl}/assets/managed/${key}`, 600), undefined)
  assert.equal(trustedImageVariant(`${siteUrl}/assets/managed/${key}`, 600, 'not a url'), undefined)
})

test('malformed managed paths are rejected', () => {
  for (const path of [
    '/assets/managed/',
    `/assets/managed/${key}?w=320`,
    `/assets/managed/${key}#top`,
    '/assets/managed/../secret.jpg',
    '/assets/managed/a..jpg',
    `/assets/managed//${key}`,
    `/assets/managed/dir/${key}`,
    `/assets/managed/${key}/`,
    `/assets/x/../managed/${key}`,
    `/assets/managed/%2e%2e%2f${key}`,
    `/assets/managed\\${key}`,
    `/assets/managed-variants/${key}/320.jpg`,
    `/assets/products/1/images/${key}`,
    `assets/managed/${key}`,
  ]) {
    assert.equal(trustedImageVariant(path, 320, siteUrl), undefined, path)
    if (path.startsWith('/')) assert.equal(trustedImageVariant(`${siteUrl}${path}`, 320, siteUrl), undefined, path)
  }
})

test('the Shopify branch keeps its ?width= rule', () => {
  assert.equal(trustedImageVariant(shopify, 960), 'https://cn.ulinktek.com/cdn/shop/files/probe.jpg?v=1700000000&width=960')
  assert.equal(
    trustedImageVariant('https://cdn.shopifycdn.net/s/files/1/0/files/a.png?width=100', 320, siteUrl),
    'https://cdn.shopifycdn.net/s/files/1/0/files/a.png?width=320',
  )
  assert.equal(trustedImageVariant('http://cn.ulinktek.com/cdn/shop/files/a.jpg', 320), undefined)
  assert.equal(trustedImageVariant('https://cn.ulinktek.com/products/a.jpg', 320), undefined)
  assert.equal(trustedImageVariant('https://example.com/cdn/shop/files/a.jpg', 320), undefined)
})

test('widths outside the allowed set are rejected', () => {
  for (const width of [0, 100, 321, 1200, 2048, Number.NaN]) {
    assert.equal(trustedImageVariant(`/assets/managed/${key}`, width, siteUrl), undefined, String(width))
    assert.equal(trustedImageVariant(shopify, width), undefined, String(width))
  }
})

test('srcset is produced only when every width resolves', () => {
  assert.equal(
    trustedImageSrcset(`/assets/managed/${key}`, IMAGE_CARD_WIDTHS, siteUrl),
    `/assets/managed/${key}?w=320 320w, /assets/managed/${key}?w=600 600w, /assets/managed/${key}?w=960 960w`,
  )
  assert.equal(
    trustedImageSrcset(`${siteUrl}/assets/managed/${key}`, IMAGE_DETAIL_WIDTHS, siteUrl),
    [600, 960, 1440].map(width => `${siteUrl}/assets/managed/${key}?w=${width} ${width}w`).join(', '),
  )
  assert.match(trustedImageSrcset(shopify, IMAGE_CARD_WIDTHS), /&width=320 320w, .*&width=960 960w$/u)
  assert.equal(trustedImageSrcset(`/assets/managed/${key}`, [320, 500], siteUrl), undefined)
  assert.equal(trustedImageSrcset('/images/local.jpg', IMAGE_CARD_WIDTHS, siteUrl), undefined)
  assert.equal(trustedImageSrcset(`/assets/managed/${key}`, [], siteUrl), undefined)
})

test('image components pass the site URL to the shared helpers', () => {
  const placeholder = readFileSync(new URL('../components/MediaPlaceholder.vue', import.meta.url), 'utf8')
  assert.match(placeholder, /trustedImageVariant\(props\.src, responsiveWidths\.value\.at\(-1\)!, siteUrl\)/)
  assert.match(placeholder, /trustedImageSrcset\(props\.src, responsiveWidths\.value, siteUrl\)/)
  const gallery = readFileSync(new URL('../components/ProductGallery.vue', import.meta.url), 'utf8')
  assert.match(gallery, /trustedImageVariant\(url, 320, siteUrl\)/)
  assert.match(gallery, /trustedImageVariant\(props\.coverImageUrl, 1440, siteUrl\)/)
})
