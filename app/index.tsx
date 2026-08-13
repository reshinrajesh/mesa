import { Redirect } from 'expo-router';

import { useAuthStore } from '@/store/authStore';

/**
 * Entry point. The root layout has already restored the session by the time
 * this renders, so the redirect is a single decision with no flash.
 */
export default function Index() {
  const kind = useAuthStore((s) => s.kind);
  return <Redirect href={kind === 'anonymous' ? '/(auth)/welcome' : '/(tabs)'} />;
}
