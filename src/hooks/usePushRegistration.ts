import { useEffect } from 'react';

import { notificationService } from '@/services';
import { hasPermission } from '@/services/notificationDevice';
import { useAuthStore } from '@/store/authStore';

/**
 * Hands the backend a push token, if there is already permission to have one.
 *
 * The gate is `hasPermission` rather than `requestPermission`, and that is the
 * whole design. Asking for notifications at launch, before the app has done
 * anything worth being notified about, is how an app collects a permanent no —
 * the same reasoning that keeps `requestPermission` on the path where a
 * reminder is actually being scheduled. So this registers only for someone who
 * has already said yes, which in practice means someone who has booked a table
 * and been asked then.
 *
 * Signed-out sessions are skipped: a token registered against nobody cannot be
 * routed to anybody, and the endpoint identifies the account by its bearer.
 *
 * It runs once per session rather than once per launch, which is the same thing
 * until somebody signs out and somebody else signs in on the same phone — and
 * then it is the difference between the new account getting the notifications
 * and the old one keeping them. There is no guard against re-registering the
 * same token: the endpoint takes it against the bearer, so sending it twice is
 * the same outcome as once.
 *
 * Against the mock services `registerForPush` returns null and this costs one
 * permission read. That is deliberate — the wiring is what makes the HTTP
 * implementation reachable, and an implementation nothing calls is the thing
 * this codebase keeps finding and deleting.
 */
export function usePushRegistration(ready: boolean) {
  const kind = useAuthStore((s) => s.kind);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    if (!ready || kind !== 'authenticated') return;

    let cancelled = false;
    void (async () => {
      if (!(await hasPermission()) || cancelled) return;
      await notificationService.registerForPush();
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, kind, userId]);
}
