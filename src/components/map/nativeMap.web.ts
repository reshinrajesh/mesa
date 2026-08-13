import type { NativeMapModule } from './nativeMap';

/**
 * The web build has no native map, and must not even look for one.
 *
 * `nativeMap.ts` already guards the lookup with try/catch, which is enough at
 * runtime — in Expo Go the require throws and the caller falls back to
 * `MapCanvas`. It is not enough at *bundle* time: Metro reads the dependency
 * graph statically, follows the `require` regardless of the try/catch, and then
 * fails the whole web build on `react-native-maps` importing React Native
 * internals that do not exist there. The result was a `web` script in
 * package.json, `react-native-web` in the dependencies, and a target that could
 * never build.
 *
 * A platform extension is the fix Metro is designed for: on web this file is
 * resolved instead of `nativeMap.ts`, so the require is never in the graph.
 * Native resolution is untouched.
 */
export function getNativeMap(): NativeMapModule | null {
  return null;
}

export const hasNativeMap = () => false;
