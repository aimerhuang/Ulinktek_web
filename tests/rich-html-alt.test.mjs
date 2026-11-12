import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readableImageAlt } from '../shared/content/rich-html.ts'

const fallback = '下水道摄像机怎么选 配图 1'

test('file-name alts without Chinese fall back to the article caption', () => {
  for (const alt of ['3188DH 2', '5D3', '01 main', '3688', '', '  ', '12']) {
    assert.equal(readableImageAlt(alt, fallback), fallback, alt)
  }
})

test('existing camera, chat-app and upload-suffix rules still apply', () => {
  assert.equal(readableImageAlt('微信图片 20260827143854', fallback), fallback)
  assert.equal(readableImageAlt('QQ20260827 143854', fallback), fallback)
  assert.equal(readableImageAlt('现场作业图 91afd379', fallback), '现场作业图')
  assert.equal(readableImageAlt('管道堵塞原因-vddstf', fallback), '管道堵塞原因')
})

test('descriptive Chinese alts are kept, including ones naming a model', () => {
  assert.equal(readableImageAlt('3188DH 管道内窥镜主机', fallback), '3188DH 管道内窥镜主机')
  assert.equal(readableImageAlt('5D3PRO 检测现场', fallback), '5D3PRO 检测现场')
})
