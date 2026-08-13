import type { Cuisine } from './restaurant';

export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'kosher'
  | 'gluten-free'
  | 'nut-allergy'
  | 'dairy-free'
  | 'pescatarian';

export interface SavedPlace {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  favoriteCuisines: Cuisine[];
  dietary: DietaryPreference[];
  savedPlaces: SavedPlace[];
  createdAt: string;
}

/** Guests browse without an account; the session models that as a real state. */
export type SessionKind = 'authenticated' | 'guest' | 'anonymous';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

export interface Session {
  kind: SessionKind;
  user: User | null;
}
