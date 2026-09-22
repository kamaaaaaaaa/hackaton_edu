// Единая точка входа в слой данных.
export * from './types'
export { config, ApiError } from './client'
export { getAssemblyPoints } from './assemblyPoints'
export { getHouse } from './house'
export type { HouseQuery } from './house'
export { getActiveAlert } from './alerts'
