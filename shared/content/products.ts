export type Product = {
  slug: string
  model?: string
  title: string
  category: string
  categorySlug: string
  name: string
  summary: string
  llmsSummary: string
  description: string
  productKind: 'finished_product' | 'accessory'
  publishedAt?: string
  applications: string[]
  highlights: Array<{ label: string; value: string; detail: string }>
  specifications: Readonly<Record<string, string>>
  videoUrl?: string
  seo: { title: string; description: string }
  contentHtml?: string
  media: { heroAlt: string; heroPath?: string; galleryPaths: string[] }
}

export const products: Product[] = [
  {
    slug: 'ul5d3',
    model: 'UL5D3',
    title: 'UL5D3 小管径便携式内窥镜',
    category: '便携式内窥镜',
    categorySlug: 'portable-endoscope',
    name: '小管径便携式内窥镜',
    summary: '23 mm 小镜头，面向 DN40 小管径检查需求。',
    llmsSummary: '23 mm 小镜头，面向 DN40 小管径检查需求。',
    description: 'UL5D3 是一款便携式内窥镜，配备 23 mm 小镜头，可进入 DN40 直径的小管道开展可视化检查。',
    productKind: 'finished_product',
    applications: ['物业排水管检测', '管道疏通前检查', '工业狭小腔体检查'],
    highlights: [
      { label: '镜头直径', value: '23 mm', detail: '适合进入 DN40 小管径。' },
      { label: '设备形态', value: '便携式', detail: '适合现场快速携带与检查。' },
      { label: '资料状态', value: '可提供', detail: '已具备中文资料、图片与说明书。' },
    ],
    specifications: {},
    seo: {
      title: 'UL5D3 便携式内窥镜 - 23 mm 小镜头 DN40 管道检测',
      description: '优联科技 UL5D3 便携式内窥镜配备 23 mm 小镜头，适用于 DN40 小管径、物业排水管和狭小腔体检查。',
    },
    media: { heroAlt: 'UL5D3 便携式内窥镜产品图片', galleryPaths: [] },
  },
  {
    slug: '3388eh',
    model: '3388EH',
    title: '3388EH 360° 旋转摄像头管道内窥镜',
    category: '立式管道内窥镜',
    categorySlug: 'vertical-pipe-endoscope',
    name: '360° 旋转摄像头管道内窥镜',
    summary: '56 mm 摄像头，支持 360° 旋转观察。',
    llmsSummary: '56 mm 摄像头，支持 360° 旋转观察。',
    description: '3388EH 是一款面向专业管道检测作业的立式管道内窥镜，搭载 56 mm 360° 旋转摄像头。',
    productKind: 'finished_product',
    applications: ['市政管网巡检', '物业排水管检测', '专业管道检测服务'],
    highlights: [
      { label: '摄像头直径', value: '56 mm', detail: '适用于专业检测场景。' },
      { label: '观察能力', value: '360° 旋转', detail: '便于从不同方向观察管道内部。' },
      { label: '设备形态', value: '立式', detail: '面向专业管道检测作业。' },
    ],
    specifications: {},
    seo: {
      title: '3388EH 立式管道内窥镜 - 360° 旋转摄像头',
      description: '优联科技 3388EH 立式管道内窥镜，配备 56 mm 360° 旋转摄像头，适用于市政管网巡检与专业管道检测。',
    },
    media: { heroAlt: '3388EH 立式管道内窥镜产品图片', galleryPaths: [] },
  },
  {
    slug: '3688h',
    model: '3688H',
    title: '3688H 自调平计米管道内窥镜',
    category: '高端管道内窥镜',
    categorySlug: 'premium-pipe-endoscope',
    name: '自调平计米管道内窥镜',
    summary: '56 mm 摄像头，具备自调平与计米功能。',
    llmsSummary: '56 mm 摄像头，具备自调平与计米功能。',
    description: '3688H 是一款高端管道内窥镜，配备 56 mm 摄像头，并具备自调平与计米功能。',
    productKind: 'finished_product',
    applications: ['市政管网巡检', '管道疏通服务', '专业管道检测作业'],
    highlights: [
      { label: '摄像头直径', value: '56 mm', detail: '面向高端管道检测作业。' },
      { label: '画面能力', value: '自调平', detail: '帮助保持检查画面的方向感。' },
      { label: '作业记录', value: '计米功能', detail: '用于记录检测过程中的长度信息。' },
    ],
    specifications: {},
    seo: {
      title: '3688H 高端管道内窥镜 - 自调平与计米功能',
      description: '优联科技 3688H 高端管道内窥镜配备 56 mm 摄像头，具备自调平和计米功能，适用于专业管道检测作业。',
    },
    media: { heroAlt: '3688H 高端管道内窥镜产品图片', galleryPaths: [] },
  },
]

export const getProduct = (slug: string) => products.find((product) => product.slug === slug)
