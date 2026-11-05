import type { User } from 'firebase/auth';

export interface IAuth {
  user: User | null;
  loading: boolean;
  username: string | null;
  chooseUsername: (username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
}

export type MapVisibility =
  | 'PUBLIC'
  | 'PRIVATE'


export interface MapSummary {
  id: string;
  title: string;
  description: string;
  visibility: MapVisibility;
  countries: string[]; // ISO 3166 two-letter codes; shown by full name (map/countries.ts)
  creator: string | null; // the owner's username
  owned: boolean; // whether the signed-in user owns it; visitors and other users can only view
}



// a named group of elements in a map; elements point at it by layerId
export interface Layer {
  id: number;
  title: string;
  description: string;
  credit?: LayerCredit | null; // set when the layer was imported from another map
}

// where an imported layer came from: set by the server, never edited
export interface LayerCredit {
  mapId: number;
  mapTitle: string;
  username: string | null;
}

export interface Faction {
  id: number;
  name: string;
  color: string;
}

// mirrors the backend's EventCategory enum (Jackson sends the constant's name)
export type EventCategory =
  | 'DEATH'
  | 'ECONOMIC_DEVELOPMENT'
  | 'ELECTION'
  | 'ATTACK'
  | 'CAPTURE'
  | 'MARITIME_ATTACK'
  | 'PLANE_CRASH'
  | 'EXPLOSION'
  | 'AIR_STRIKE'
  | 'CHEMICAL_WEAPON'
  | 'DRONE_ATTACK'
  | 'GRENADE'
  | 'ONE_WAY_DRONE'
  | 'IED'
  | 'SHELLING_ARTILLERY_MISSILE_ATTACK'
  | 'AGREEMENT'
  | 'ARRESTS'
  | 'CHANGE_TO_GROUP'
  | 'HEADQUARTERS_ESTABLISHED'
  | 'NON_VIOLENT_TERRITORY_TRANSFER'
  | 'OPERATION'
  | 'LEGISLATION'
  | 'PEACEFUL_PROTEST'
  | 'VIOLENT_PROTEST'
  | 'ABDUCTION'
  | 'ATTACK_ON_CIVILIANS'
  | 'LOOTING'
  | 'PROPERTY_DESTRUCTION'
  | 'STORM'
  | 'EARTHQUAKE'
  | 'OTHER'

// mirrors the backend's EventRelationType enum
export type EventRelationType = 'PartOf' | 'causedBy' | 'RetaliationTo' | 'Other'

// what every element drawn on a map has, like the backend's ElementSummary
export interface MapElement {
  id: number; // stableId
  factionId: number | null;
  layerId?: number | null; // null = in no layer
}

// a link from one event to another; relatedEventId is the other event's id
export interface EventRelation {
  relatedEventId: number;
  type: EventRelationType;
}

export interface EventMarker extends MapElement {
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  category: EventCategory | null; // null for events created before categories existed
  factionId: number; // narrowed: events always have a faction
  sourceURL: string;
  relations?: EventRelation[]; // missing on responses from before relations existed
  endTime?: string | null; // null: a moment (ends when it starts) or ongoing
  ongoing?: boolean;
  visibleDays?: number; // days it stays on the map after it ends
}

export interface Territory extends MapElement {
  name: string;
  color: string;
  points: string;
  factionId: number; // narrowed: territories always have a faction
  history?: TerritoryState[]; // the shapes over time, sorted by `from`; the first one's `from` is when it was created
  endTime?: string | null; // null = ongoing (still there)
}

// one shape of a territory over time (the backend's TerritoryStateDto): holds from `from` until the next one
export interface TerritoryState {
  from: string | null; // null: this shape has always been there
  points: string;
  factionId: number;
  color: string;
}

export type DrawMode = 'polygon' | 'freehand' | 'select'

export interface DraftStatus {
  exists: boolean;
  hasChanges: boolean;
  createdAt: string | null; // ISO LocalDateTime (no timezone), null when there's no draft
}

// mirrors the backend's AnnotationKind enum (Jackson sends the constant's name)
export type AnnotationKind = 'AMBUSH' | 'ARROW' | 'DESTROY' | 'OBJECTIVE'

// a tactical graphic stamped on the map: the kind's icon at a point, in `color`, sized by `scale`
export interface Annotation extends MapElement {
  kind: AnnotationKind;
  geometry: string; // GeoJSON geometry as text, e.g. {"type":"Point","coordinates":[lng,lat]}
  factionId: number | null;
  label: string | null;
  color: string | null;
  scale: number; // 1.0 = default size
  rotation: number; // clockwise degrees, 0 = the icon's normal (up) direction
  startTime?: string | null; // null = it has always been there
  endTime?: string | null; // null = still there
}

// GET /api/maps/{id}/changes: one element the draft changed, mirroring the backend's ChangeDto.
// before/after are the element's usual summary (Territory, EventMarker, Annotation or Layer, as entityType says):
// before is null when added, after is null when deleted
export type MapChange = ChangeOf<'TERRITORY', Territory> | ChangeOf<'EVENT', EventMarker> | ChangeOf<'ANNOTATION', Annotation>
  | ChangeOf<'LAYER', Layer>

type ChangeOf<E extends 'TERRITORY' | 'EVENT' | 'ANNOTATION' | 'LAYER', T extends MapElement | Layer> = {
  entityType: E;
  stableId: number;
  action: MapChangeAction;
  name: string | null;
  before: T | null;
  after: T | null;
}

export type MapChangeAction = 'ADDED' | 'MODIFIED' | 'DELETED'
