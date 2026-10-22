import type { User } from 'firebase/auth';

export interface LoginFormValues {
 email: string;
 password: string;
}

export interface UserFormValues {
 email: string;
 password: string;
 displayName?: string;
}

export interface IAuth {
 user: User | null;
 loading: boolean;
 signIn: (creds: LoginFormValues) => Promise<void>;
 signUp: (creds: UserFormValues) => Promise<void>;
 signOut: () => void;
}

export interface MapSummary {
  id: string;
  title: string;
  description: string;
}

export interface Faction {
  id: number;
  name: string;
  color: string;
}

// mirrors the backend's EventCategory enum (Jackson sends the constant's name)
export type EventCategory =
  | 'DEATH'
  | 'ATTACK'
  | 'CAPTURE'
  | 'EXPLOSION'
  | 'PEACEFUL_PROTEST'
  | 'VIOLENT_PROTEST'
  | 'SHELLING_ARTILLERY_MISSILE_ATTACK'
  | 'OTHER'

// mirrors the backend's EventRelationType enum
export type EventRelationType = 'PartOf' | 'causedBy' | 'RetaliationTo' | 'Other'

// a link from one event to another; relatedEventId is the other event's id
export interface EventRelation {
  relatedEventId: number;
  type: EventRelationType;
}

export interface EventMarker {
  id: number;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  category: EventCategory | null; // null for events created before categories existed
  factionId: number;
  sourceURL: string;
  relations?: EventRelation[]; // missing on responses from before relations existed
}

export interface Territory {
  id: number;
  name: string;
  color: string;
  points: string;
  factionId: number;
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
export interface Annotation {
  id: number; // stableId, like the other *SummaryResponse ids
  kind: AnnotationKind;
  geometry: string; // GeoJSON geometry as text, e.g. {"type":"Point","coordinates":[lng,lat]}
  factionId: number | null;
  label: string | null;
  color: string | null;
  scale: number; // 1.0 = default size
  rotation: number; // clockwise degrees, 0 = the icon's normal (up) direction
}
