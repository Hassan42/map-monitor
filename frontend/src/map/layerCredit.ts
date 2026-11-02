import type { LayerCredit } from '../types/types'

// "From Front line by hassan"; the username is left out when the owner has none yet
export function creditText(credit: LayerCredit): string {
  return `From ${credit.mapTitle}${credit.username ? ` by ${credit.username}` : ''}`
}
