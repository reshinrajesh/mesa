import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, configure, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import type { AppNotification, Reservation } from '@/types';

import { config } from '@/constants/config';
import { useAuthStore } from '@/store/authStore';
import { storageKeys } from '@/utils/storage';

/**
 * Rendering a whole route.
 *
 * The component tests render one component with props. These render what the
 * user actually opens: the screen, its queries, its services and the storage
 * underneath them, with only the native edges mocked. That is the only level at
 * which "the Clear button appears once something has been read" is a fact
 * rather than an intention.
 *
 * They live under `src/` rather than beside the screens because they cannot
 * live beside the screens. expo-router builds its route table from
 * `require.context(app, true, /.*\.[tj]sx?$/)` — every file under `app/` except
 * `+api` and `+html` becomes a route — so `app/notifications.test.tsx` would
 * ship in the bundle as a screen called "notifications.test".
 */

/**
 * Longer than the default second for `findBy*` and `waitFor`.
 *
 * The mock services answer in 180–520ms and a screen usually makes two or three
 * round trips before it settles, which is comfortably inside a second on an
 * idle machine and marginal on a busy one. A test that fails only when the CPU
 * is loaded is worse than a slow one: it fails somewhere else, later, in front
 * of somebody who did not write it. Nothing here passes that would otherwise
 * fail — a broken assertion still breaks, four seconds further on.
 */
configure({ asyncUtilTimeout: 5_000 });

/** Fixed insets: the real provider measures asynchronously and never resolves in a test. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Every client handed out this test, so the lifecycle below can dispose them. */
const clients: QueryClient[] = [];

/**
 * Importing this module opts a suite into its cleanup, deliberately.
 *
 * Two separate problems, and the second one is not cosmetic.
 *
 * A `QueryClient` with live subscriptions keeps the whole run alive well past
 * the assertions: before this hook existed, a suite whose tests took eleven
 * seconds took minutes to exit. Dropping each client at the end of its own test
 * fixes that.
 *
 * The draining is the important half. A test that ends while a refetch and a
 * sheet's closing animation are still in flight leaves an `act()` open, and the
 * next `render` starts another one on top of it — "overlapping act() calls",
 * after which the renderer wedges and *every later test in the file renders
 * nothing*. It presents as three tests that pass alone and fail together, which
 * is a long afternoon if you go looking for it in the screen.
 *
 * So: outlast the longest timer a screen can still be holding, then wait for
 * whatever fetch that timer started, and only then take the tree away. The
 * order matters — draining first and waiting second let the search debounce
 * fire into an unmounted tree, which is exactly the wedge described above.
 */
afterEach(async () => {
  await act(async () => {
    // Search is debounced, and the timer is armed on mount whether or not
    // anyone types. Taken from the app's own config rather than a number that
    // happens to be bigger today: a 250ms wait against a 280ms debounce is a
    // suite that fails in a way nobody will connect to this line.
    await new Promise((resolve) => setTimeout(resolve, config.searchDebounceMs + 120));

    const deadline = Date.now() + 3_000;
    while (clients.some((client) => client.isFetching() > 0) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  });

  for (const client of clients) {
    client.cancelQueries();
    client.unmount();
    client.clear();
  }
  clients.length = 0;
});

export interface ScreenOptions {
  /** Session kind. Screens behave differently for a guest. */
  session?: 'authenticated' | 'guest' | 'anonymous';
}

/**
 * Renders a route component with the providers the app gives it.
 *
 * A fresh `QueryClient` per call, with retries off: a screen under test that
 * hits an error path should show it immediately rather than three seconds later.
 */
export async function renderScreen(ui: React.ReactElement, options: ScreenOptions = {}) {
  useAuthStore.setState({
    kind: options.session ?? 'authenticated',
    user: null,
    hydrated: true,
  });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  clients.push(client);

  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

/**
 * Puts the app's storage in a known state, past the seeding path.
 *
 * Seeds are a fine first run and a terrible fixture: they move with the clock
 * and change whenever the seed does. Setting each `-seeded` flag first is what
 * keeps the services from writing their own data over this.
 */
export async function givenStorage(options: {
  notifications?: AppNotification[];
  reservations?: Reservation[];
}) {
  await AsyncStorage.clear();

  await AsyncStorage.setItem('mesa.notifications-seeded', JSON.stringify(true));
  await AsyncStorage.setItem(
    storageKeys.notifications,
    JSON.stringify(options.notifications ?? []),
  );

  await AsyncStorage.setItem('mesa.reservations-seeded', JSON.stringify(true));
  await AsyncStorage.setItem(storageKeys.reservations, JSON.stringify(options.reservations ?? []));
}

/** Reads the inbox back off disk, to check what a screen actually persisted. */
export async function storedNotifications(): Promise<AppNotification[]> {
  const raw = await AsyncStorage.getItem(storageKeys.notifications);
  return raw ? (JSON.parse(raw) as AppNotification[]) : [];
}

/** The floor DESIGN.md §9 promises, and iOS and Android both ask for. */
export const MIN_TOUCH_TARGET = 44;

/** Interactive roles this app actually uses. */
const PRESSABLE_ROLES = ['button', 'tab', 'link', 'switch', 'search'] as const;

export interface TouchTarget {
  label: string;
  /** Null where the dimension comes from layout rather than from the style. */
  width: number | null;
  height: number | null;
}

function edges(hitSlop: unknown) {
  if (typeof hitSlop === 'number') {
    return { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop };
  }
  const slop = (hitSlop ?? {}) as Record<string, number | undefined>;
  return {
    top: slop.top ?? 0,
    bottom: slop.bottom ?? 0,
    left: slop.left ?? 0,
    right: slop.right ?? 0,
  };
}

/**
 * Every pressable on screen whose own style states a size, hit area included.
 *
 * DESIGN.md has promised a 44×44 minimum since the first commit, enforced by
 * "a computed `hitSlop`" on anything that renders smaller. Contrast used to be
 * a promise like that too, and computing it found five violations — so this
 * computes what it can.
 *
 * What it can is bounded, and the bound is stated rather than hidden: a control
 * sized by flex, padding or its own text has no dimension until a layout engine
 * runs, and there is no layout engine here. Those come back null and are not
 * asserted on. What is left is exactly the class the promise is about — the
 * small fixed-size icon buttons — which is also the class that gets it wrong.
 */
export function measurableTouchTargets(): TouchTarget[] {
  const targets: TouchTarget[] = [];

  for (const role of PRESSABLE_ROLES) {
    for (const node of screen.queryAllByRole(role)) {
      const style = (StyleSheet.flatten(node.props.style) ?? {}) as Record<string, unknown>;
      const slop = edges(node.props.hitSlop);

      const width = (style.width ?? style.minWidth) as number | undefined;
      const height = (style.height ?? style.minHeight) as number | undefined;

      targets.push({
        label: String(node.props.accessibilityLabel ?? role),
        width: typeof width === 'number' ? width + slop.left + slop.right : null,
        height: typeof height === 'number' ? height + slop.top + slop.bottom : null,
      });
    }
  }

  return targets;
}

/** Fails with the offender named, since "something is too small" is not a fix. */
export function expectEveryTargetReachable() {
  for (const target of measurableTouchTargets()) {
    if (target.width !== null && target.width < MIN_TOUCH_TARGET) {
      throw new Error(`"${target.label}" is ${target.width}pt wide, needs ${MIN_TOUCH_TARGET}`);
    }
    if (target.height !== null && target.height < MIN_TOUCH_TARGET) {
      throw new Error(`"${target.label}" is ${target.height}pt tall, needs ${MIN_TOUCH_TARGET}`);
    }
  }
}

interface HostNode {
  type: unknown;
  props: Record<string, unknown>;
  children: (HostNode | string)[];
}

function descendants(node: HostNode | string, out: HostNode[] = []): HostNode[] {
  if (typeof node === 'string') return out;
  out.push(node);
  for (const child of node.children ?? []) descendants(child, out);
  return out;
}

export interface Control {
  label: string | null;
  role: string | null;
  /** True when the node is deliberately hidden from assistive technology. */
  excused: boolean;
}

/**
 * Every control on screen, found by its press handling rather than by its role.
 *
 * The distinction is the entire point. `queryAllByRole('button')` can only find
 * controls that already declare a role, which means the audit would be blind to
 * exactly the omission it exists to catch. React Native routes every press
 * through the responder system, so `onStartShouldSetResponder` is present on a
 * pressable whether or not anybody remembered to describe it.
 */
export function controls(): Control[] {
  return descendants(screen.root as unknown as HostNode)
    .filter((node) => 'onStartShouldSetResponder' in node.props)
    .map((node) => ({
      label: (node.props.accessibilityLabel as string) ?? null,
      role: (node.props.accessibilityRole as string) ?? null,
      excused:
        node.props.accessible === false ||
        node.props.importantForAccessibility === 'no-hide-descendants',
    }));
}

/**
 * DESIGN.md §9: "every interactive element has a role, a label and a state".
 *
 * A control with neither is not a minor omission — a screen reader announces it
 * as an unlabelled button, which is worse than silence, because it invites a
 * press with no way to know what happens. The escape hatch is `accessible=
 * {false}`: something genuinely decorative has to say so in the source rather
 * than by being forgotten.
 */
export function expectEveryControlAnnounced() {
  for (const control of controls()) {
    if (control.excused) continue;

    if (!control.label || control.label.trim().length === 0) {
      throw new Error(
        `a ${control.role ?? 'pressable'} has no accessibility label; give it one, or mark it accessible={false}`,
      );
    }
    if (!control.role) {
      throw new Error(`"${control.label}" has no accessibility role`);
    }
  }
}

export function notification(
  id: string,
  overrides: Partial<AppNotification> = {},
): AppNotification {
  return {
    id,
    kind: 'reservation-confirmed',
    title: `Notification ${id}`,
    body: 'Something happened.',
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    readAt: null,
    ...overrides,
  };
}
