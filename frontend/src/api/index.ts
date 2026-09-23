// Единая точка входа в слой данных.
export * from './types'
export { config, ApiError } from './client'
export {
  getAssemblyPoints,
  getMappedPoints,
  getPointById,
  countDistricts,
  OFFICIAL_TOTAL,
} from './assemblyPoints'
export { getHouse } from './house'
export type { HouseQuery } from './house'
export { searchAddress } from './search'
export type { SearchOutcome } from './search'
export { reverseGeocode } from './reverse'
export { walkingRoute, findFastestPoint } from './route'
export type { FastestResult } from './route'
export { TomTomError } from './tomtom'
export { getActiveAlert } from './alerts'
