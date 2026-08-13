import {
  Fraunces_400Regular,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  useFonts as useFraunces,
} from '@expo-google-fonts/fraunces';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';

/**
 * Font loading.
 *
 * Returns ready on error as well as on success. A font that fails to download
 * must degrade to the system face, not hold the splash screen forever — the
 * app is still completely usable in the system stack, and a permanent splash
 * is the worse failure by a wide margin.
 */
export function useAppFonts(): { ready: boolean; failed: boolean } {
  const [loaded, error] = useFraunces({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
  });

  return { ready: loaded || Boolean(error), failed: Boolean(error) };
}
