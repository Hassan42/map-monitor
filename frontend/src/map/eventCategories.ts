import type { EventCategory } from '../types/types'
import deathIcon from '../assets/markers/death_marker.svg'
import economicDevelopmentIcon from '../assets/markers/economic_development.svg'
import electionIcon from '../assets/markers/election.svg'
import attackIcon from '../assets/markers/attack_marker.svg'
import flagIcon from '../assets/markers/flag_marker.svg'
import maritimeAttackIcon from '../assets/markers/maritime_attack.svg'
import planeCrashIcon from '../assets/markers/plane_crash.svg'
import explosionIcon from '../assets/markers/explosion_marker.svg'
import airStrikeIcon from '../assets/markers/air_strike.svg'
import chemicalWeaponIcon from '../assets/markers/chemical_weapon.svg'
import droneAttackIcon from '../assets/markers/drone_attack.svg'
import grenadeIcon from '../assets/markers/grenade.svg'
import oneWayDroneIcon from '../assets/markers/one_way_drone.svg'
import iedIcon from '../assets/markers/ied.svg'
import shellingIcon from '../assets/markers/shelling_missile_attack.svg'
import announcementIcon from '../assets/markers/announcement.svg'
import agreementIcon from '../assets/markers/agreement.svg'
import arrestsIcon from '../assets/markers/arrests.svg'
import changeToGroupIcon from '../assets/markers/change_to_group.svg'
import headquartersIcon from '../assets/markers/headquarters.svg'
import territoryTransferIcon from '../assets/markers/territory_transfer.svg'
import operationIcon from '../assets/markers/operation.svg'
import legislationIcon from '../assets/markers/legislation.svg'
import peacefulProtestIcon from '../assets/markers/peaceful_protest.svg'
import violentProtestIcon from '../assets/markers/violent_protest.svg'
import abductionIcon from '../assets/markers/abduction.svg'
import attackOnCiviliansIcon from '../assets/markers/attack_on_civilians.svg'
import lootingIcon from '../assets/markers/looting.svg'
import propertyDestructionIcon from '../assets/markers/property_destruction.svg'
import stormIcon from '../assets/markers/storm.svg'
import earthquakeIcon from '../assets/markers/earthquake.svg'
import otherIcon from '../assets/markers/other_marker.svg'

// every backend category -> how it's shown on the map and in the UI. Record<EventCategory, ...>
// makes the build fail if a category is added to the type but forgotten here.
// icon: a single-color svg (recolored white on the marker); null would mean a plain faction-colored circle
export const EVENT_CATEGORIES: Record<EventCategory, { label: string; icon: string | null }> = {
  DEATH: { label: 'Death', icon: deathIcon },
  ECONOMIC_DEVELOPMENT: { label: 'Economic development', icon: economicDevelopmentIcon },
  ELECTION: { label: 'Election', icon: electionIcon },
  ATTACK: { label: 'Attack', icon: attackIcon },
  CAPTURE: { label: 'Capture', icon: flagIcon },
  MARITIME_ATTACK: { label: 'Maritime attack', icon: maritimeAttackIcon },
  PLANE_CRASH: { label: 'Plane crash', icon: planeCrashIcon },
  EXPLOSION: { label: 'Explosion', icon: explosionIcon },
  AIR_STRIKE: { label: 'Air strike', icon: airStrikeIcon },
  CHEMICAL_WEAPON: { label: 'Chemical/radiation weapon', icon: chemicalWeaponIcon },
  DRONE_ATTACK: { label: 'Drone attack', icon: droneAttackIcon },
  GRENADE: { label: 'Grenade', icon: grenadeIcon },
  ONE_WAY_DRONE: { label: 'One-way drone', icon: oneWayDroneIcon },
  IED: { label: 'IED', icon: iedIcon },
  SHELLING_ARTILLERY_MISSILE_ATTACK: { label: 'Shelling attack', icon: shellingIcon },
  ANNOUNCEMENT: { label: 'Announcement', icon: announcementIcon },
  AGREEMENT: { label: 'Agreement', icon: agreementIcon },
  ARRESTS: { label: 'Arrests', icon: arrestsIcon },
  CHANGE_TO_GROUP: { label: 'Change to group/activity', icon: changeToGroupIcon },
  HEADQUARTERS_ESTABLISHED: { label: 'Headquarters or base established', icon: headquartersIcon },
  NON_VIOLENT_TERRITORY_TRANSFER: { label: 'Non-violent transfer of territory', icon: territoryTransferIcon },
  OPERATION: { label: 'Operation', icon: operationIcon },
  LEGISLATION: { label: 'Legislation', icon: legislationIcon },
  PEACEFUL_PROTEST: { label: 'Peaceful protest', icon: peacefulProtestIcon },
  VIOLENT_PROTEST: { label: 'Violent protest', icon: violentProtestIcon },
  ABDUCTION: { label: 'Abduction/forced disappearance', icon: abductionIcon },
  ATTACK_ON_CIVILIANS: { label: 'Attack on civilians', icon: attackOnCiviliansIcon },
  LOOTING: { label: 'Looting', icon: lootingIcon },
  PROPERTY_DESTRUCTION: { label: 'Property destruction', icon: propertyDestructionIcon },
  STORM: { label: 'Storm', icon: stormIcon },
  EARTHQUAKE: { label: 'Earthquake', icon: earthquakeIcon },
  OTHER: { label: 'Other', icon: otherIcon },
}

export const EVENT_CATEGORY_LIST = Object.keys(EVENT_CATEGORIES) as EventCategory[]

// how the category picker groups them; the satisfies check fails the build if one is in no group
export const EVENT_CATEGORY_GROUPS = [
  { label: 'General', categories: ['DEATH', 'ECONOMIC_DEVELOPMENT', 'ELECTION', 'OTHER'] },
  { label: 'Battles', categories: ['ATTACK', 'CAPTURE', 'MARITIME_ATTACK', 'PLANE_CRASH'] },
  {
    label: 'Explosions/remote violence',
    categories: ['EXPLOSION', 'AIR_STRIKE', 'CHEMICAL_WEAPON', 'DRONE_ATTACK', 'ONE_WAY_DRONE', 'GRENADE', 'IED', 'SHELLING_ARTILLERY_MISSILE_ATTACK'],
  },
  {
    label: 'Political announcement',
    categories: ['ANNOUNCEMENT', 'AGREEMENT', 'ARRESTS', 'CHANGE_TO_GROUP', 'HEADQUARTERS_ESTABLISHED', 'NON_VIOLENT_TERRITORY_TRANSFER', 'OPERATION', 'LEGISLATION'],
  },
  { label: 'Protests', categories: ['PEACEFUL_PROTEST', 'VIOLENT_PROTEST'] },
  { label: 'Violence against civilians', categories: ['ABDUCTION', 'ATTACK_ON_CIVILIANS', 'LOOTING', 'PROPERTY_DESTRUCTION'] },
  { label: 'Natural disasters', categories: ['STORM', 'EARTHQUAKE'] },
] as const satisfies readonly { label: string; categories: readonly EventCategory[] }[]

type GroupedCategory = (typeof EVENT_CATEGORY_GROUPS)[number]['categories'][number]
// compile-time check: every category appears in some group
const allGrouped: Record<Exclude<EventCategory, GroupedCategory>, never> = {}
void allGrouped

// events created before categories existed come back with null; they get OTHER's icon
export const categoryOf = (event: { category: EventCategory | null }): EventCategory => event.category ?? 'OTHER'
