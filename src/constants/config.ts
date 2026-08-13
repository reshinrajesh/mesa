/**
 * Runtime configuration.
 *
 * There are no secrets in this file and there must never be any. Anything in a
 * React Native bundle is readable by anyone who downloads the app — API keys,
 * signing secrets and provider credentials belong on a server that the client
 * calls, not here. `apiBaseUrl` is a public origin; nothing else is added.
 */
export const config = {
  appName: 'Mesa',

  /** Flip to `false` once a real backend exists behind `apiBaseUrl`. */
  useMockServices: true,

  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.mesa.example',

  /** Every network call aborts here rather than hanging a spinner forever. */
  requestTimeoutMs: 12_000,

  /** Simulated latency window for the mock services, in milliseconds. */
  mockLatency: { min: 180, max: 520 },

  /**
   * Probability that a mock read fails.
   *
   * Read from the environment rather than hardcoded, because a knob you have to
   * edit source to turn is a knob nobody turns: every `ErrorState` in the app —
   * on Explore, Home, Bookings, the restaurant page and the menu — renders only
   * when a query rejects, which in a default run never happens. They were fully
   * built and had never been on screen.
   *
   *     EXPO_PUBLIC_MOCK_FAILURE_RATE=0.35 npm start
   *
   * Zero by default: a demo that fails a third of its reads is not a demo.
   */
  mockFailureRate: Number(process.env.EXPO_PUBLIC_MOCK_FAILURE_RATE ?? 0) || 0,

  /** Default map centre when location permission is refused: downtown Lisbon. */
  fallbackLocation: {
    latitude: 38.7139,
    longitude: -9.1394,
    label: 'Baixa, Lisbon',
  },

  /** How far ahead the booking calendar runs. */
  bookingWindowDays: 60,

  /** Party sizes offered in the stepper before "larger party" takes over. */
  maxPartySizeOnline: 12,

  /**
   * Waitlist pacing.
   *
   * A real backend pushes "a table just freed" as an event. The mock has no
   * server to push one, so the queue advances on a clock instead: one party
   * ahead resolves every `queueMoveMs`, and reaching the front starts a hold of
   * `holdMinutes`.
   *
   * The move interval is deliberately short — the whole join → offer → accept
   * loop has to be visible inside a demo rather than tomorrow. The hold is real
   * minutes, because that is the number the guest is asked to act on and
   * shrinking it would teach a habit the live app would then punish.
   */
  waitlist: {
    queueMoveMs: 20_000,
    holdMinutes: 20,
    /** Longest queue the mock will put someone in. */
    maxQueueLength: 5,
  },

  pageSize: 12,

  /** Debounce for the search field. Long enough to skip a word, short enough to feel live. */
  searchDebounceMs: 280,

  support: {
    email: 'hello@mesa.example',
    phone: '+351 210 000 000',
  },
} as const;
