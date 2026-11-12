import { getManuals } from '~/server/utils/cms'
export default defineEventHandler((event) => getManuals(useRuntimeConfig(event), getQuery(event).product as string | undefined))
