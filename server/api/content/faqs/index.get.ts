import { getFaqs } from '~/server/utils/cms'
export default defineEventHandler((event) => getFaqs(useRuntimeConfig(event), getQuery(event).product as string | undefined))
