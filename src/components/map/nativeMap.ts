import { log } from '@/utils/log';

/**
 * Optional native map.
 *
 * `react-native-maps` requires a development build and is absent from Expo Go.
 * Requiring it at module scope would crash the whole Explore tab there, so it
 * is resolved lazily inside a try/catch and the caller falls back to
 * `MapCanvas` when it is missing.
 *
 * This is the one place in the app that uses `require`, and it is deliberate:
 * a static `import` cannot be made conditional.
 */

interface NativeMapModule {
  MapView: React.ComponentType<Record<string, unknown>>;
  Marker: React.ComponentType<Record<string, unknown>>;
}

let cached: NativeMapModule | null | undefined;

export function getNativeMap(): NativeMapModule | null {
  if (cached !== undefined) return cached;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('react-native-maps') as {
      default?: React.ComponentType<Record<string, unknown>>;
      Marker?: React.ComponentType<Record<string, unknown>>;
    };

    if (module?.default && module?.Marker) {
      cached = { MapView: module.default, Marker: module.Marker };
    } else {
      cached = null;
    }
  } catch (error) {
    log.debug('map', 'native map unavailable, using the fallback canvas', error);
    cached = null;
  }

  return cached;
}

export const hasNativeMap = () => getNativeMap() !== null;
