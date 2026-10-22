import type { EventCategory } from '../types/types'
import deathIcon from '../assets/markers/death_marker.svg'
import attackIcon from '../assets/markers/attack_marker.svg'
import flagIcon from '../assets/markers/flag_marker.svg'
import explosionIcon from '../assets/markers/explosion_marker.svg'
import peacefulProtestIcon from '../assets/markers/peaceful_protest.svg'
import violentProtestIcon from '../assets/markers/violent_protest.svg'
import shellingIcon from '../assets/markers/shelling_missile_attack.svg'
import otherIcon from '../assets/markers/other_marker.svg'

// every backend category -> how it's shown on the map and in the UI. Record<EventCategory, ...>
// makes the build fail if a category is added to the type but forgotten here.
// icon: a single-color svg (recolored white on the marker); null would mean a plain faction-colored circle
export const EVENT_CATEGORIES: Record<EventCategory, { label: string; icon: string | null }> = {
  DEATH: { label: 'Death', icon: deathIcon },
  ATTACK: { label: 'Attack', icon: attackIcon },
  CAPTURE: { label: 'Capture', icon: flagIcon },
  EXPLOSION: { label: 'Explosion', icon: explosionIcon },
  PEACEFUL_PROTEST: { label: 'Peaceful protest', icon: peacefulProtestIcon },
  VIOLENT_PROTEST: { label: 'Violent protest', icon: violentProtestIcon },
  SHELLING_ARTILLERY_MISSILE_ATTACK: { label: 'Shelling/artillery/missile attack', icon: shellingIcon },
  OTHER: { label: 'Other', icon: otherIcon },
}

export const EVENT_CATEGORY_LIST = Object.keys(EVENT_CATEGORIES) as EventCategory[]

// events created before categories existed come back with null; they get OTHER's icon
export const categoryOf = (event: { category: EventCategory | null }): EventCategory => event.category ?? 'OTHER'
