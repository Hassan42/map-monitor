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
export type EventCategory = 'DEATH' | 'ATTACK' | 'CAPTURE' | 'EXPLOSION' | 'OTHER'

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
