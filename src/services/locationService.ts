import * as Location from 'expo-location';

import { config } from '@/constants/config';
import { log } from '@/utils/log';

export interface ActiveLocation {
  latitude: number;
  longitude: number;
  label: string;
  /** How the coordinate was obtained, so the UI can say so honestly. */
  source: 'device' | 'saved-place' | 'fallback';
}

export const fallbackLocation: ActiveLocation = {
  ...config.fallbackLocation,
  source: 'fallback',
};

/**
 * Location, with a refusal treated as a normal outcome rather than an error.
 *
 * Distances are a nice-to-have here, not a requirement: someone who declines
 * the permission still gets the full app, with the distance line simply absent
 * and the city centre used as the map origin. Nothing nags them afterwards.
 */
export const locationService = {
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === Location.PermissionStatus.GRANTED) return 'granted';
      if (status === Location.PermissionStatus.DENIED) return 'denied';
      return 'undetermined';
    } catch {
      return 'undetermined';
    }
  },

  async requestCurrent(): Promise<ActiveLocation | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) return null;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const label = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        label,
        source: 'device',
      };
    } catch (error) {
      log.warn('location', 'could not read current position', error);
      return null;
    }
  },
};

async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!place) return 'Current location';
    // District reads better than street for a location chip.
    return place.district ?? place.subregion ?? place.city ?? 'Current location';
  } catch {
    return 'Current location';
  }
}
