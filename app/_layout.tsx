import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CACHE_BUSTER, createQueryClient, queryPersister } from '@/lib/queryClient';
import { ToastHost } from '@/components/ui';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useAuthStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useSearchStore } from '@/store/searchStore';
import { useUiStore } from '@/store/uiStore';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            buster: CACHE_BUSTER,
            maxAge: 24 * 60 * 60 * 1000,
            dehydrateOptions: {
              // Only successful reads are worth restoring. Persisting an error
              // would resurrect yesterday's outage on tomorrow's launch.
              shouldDehydrateQuery: (query) => query.state.status === 'success',
            },
          }}
        >
          <ThemeProvider>
            <AppShell />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const theme = useTheme();
  const { ready: fontsReady } = useAppFonts();

  const hydrateAuth = useAuthStore((s) => s.restore);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const hydrateFavorites = useFavoritesStore((s) => s.hydrate);
  const hydrateUi = useUiStore((s) => s.hydrate);
  const hydrateRecent = useSearchStore((s) => s.hydrateRecent);

  useEffect(() => {
    void hydrateAuth();
    void hydrateFavorites();
    void hydrateUi();
    void hydrateRecent();
  }, [hydrateAuth, hydrateFavorites, hydrateUi, hydrateRecent]);

  const bootReady = fontsReady && authHydrated;

  useEffect(() => {
    if (bootReady) SplashScreen.hideAsync().catch(() => {});
  }, [bootReady]);

  useProtectedRoute(bootReady);

  // Holding the splash rather than flashing an unstyled frame first.
  if (!bootReady) return null;

  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.canvas },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="restaurant/[id]/index" />
        <Stack.Screen name="restaurant/[id]/menu" />
        <Stack.Screen name="restaurant/[id]/reviews" />
        <Stack.Screen name="restaurant/[id]/photos" />
        <Stack.Screen name="reserve/[restaurantId]/index" />
        <Stack.Screen name="reserve/[restaurantId]/review" />
        <Stack.Screen
          name="reserve/[restaurantId]/confirmation"
          // No swipe-back off a confirmation: the booking is done and the
          // wizard behind it is stale.
          options={{ gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen name="reservation/[id]/index" />
        <Stack.Screen name="reservation/[id]/edit" />
        <Stack.Screen name="search/index" options={{ animation: 'fade' }} />
        <Stack.Screen name="map" />
        <Stack.Screen name="location-picker" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="profile/settings" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/preferences" />
        <Stack.Screen name="profile/saved-places" />
        <Stack.Screen name="profile/help" />
        <Stack.Screen name="profile/legal" />
      </Stack>

      <ToastHost />
    </>
  );
}

/**
 * Route guard.
 *
 * Guests get the whole browsing surface; only the screens that write something
 * (reservations, profile) push to sign-in. That is deliberate — forcing an
 * account before someone has seen a single restaurant is the fastest way to
 * lose them.
 */
function useProtectedRoute(ready: boolean) {
  const segments = useSegments();
  const router = useRouter();
  const kind = useAuthStore((s) => s.kind);

  useEffect(() => {
    if (!ready) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (kind === 'anonymous' && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (kind !== 'anonymous' && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, kind, segments, router]);
}
