import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { routeFor } from '@/features/notifications/routing';
import { useAuthStore } from '@/store/authStore';

/**
 * Opens what a tapped notification was about.
 *
 * `useLastNotificationResponse` is the hook that covers the case that matters:
 * a phone in a pocket, the app not running, a table held for twenty minutes.
 * A listener registered in an effect misses that tap entirely — the response
 * arrives before any component mounts — whereas this replays it on first
 * render, which is why the cold start works at all.
 *
 * Gated on `ready` because the router has to exist before it can be pushed to,
 * and because `useProtectedRoute` performs a `replace` of its own on boot: a
 * push that lands first is simply thrown away by it a frame later.
 */
export function useNotificationRouting(ready: boolean) {
  const response = Notifications.useLastNotificationResponse();
  const router = useRouter();
  const kind = useAuthStore((s) => s.kind);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !response) return;

    // A signed-out session is about to be replaced with the welcome screen, so
    // there is nothing worth pushing underneath it. The tap is not lost: the
    // response stays the last one, and this runs again once they are in.
    if (kind === 'anonymous') return;

    // Only a tap on the notification itself. A swipe-away or a custom action is
    // not a request to go anywhere.
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const id = response.notification.request.identifier;
    if (handled.current === id) return;

    const route = routeFor(response.notification.request.content.data);
    if (!route) return;

    handled.current = id;
    // `as never` because typed routes cannot know a path assembled at runtime.
    // What makes it safe is `routeFor`, which rebuilds the path from a
    // validated id rather than trusting the string it was handed.
    router.push(route as never);
  }, [ready, response, router, kind]);
}
