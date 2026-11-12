import { getProducts } from '~/server/utils/cms'

export default defineEventHandler((event) => getProducts(useRuntimeConfig(event)))
