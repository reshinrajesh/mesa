/**
 * Where a notification is allowed to lead.
 *
 * Every notification this app schedules already carried an `href` — the booking
 * reminder and, more to the point, the waitlist alert that says a table is
 * being held and will go to someone else. Nothing read it. Tapping the alert
 * for a twenty-minute hold opened the app wherever it happened to be, and the
 * one notification in Mesa with a deadline attached was the one that led
 * nowhere. That is this module's reason to exist.
 *
 * It is a whitelist rather than a redirect, and that distinction is the whole
 * design. A notification payload is input: today the client writes it, but
 * `registerForPush` exists and the day a server fills that field it is input
 * from the network. Handing an arbitrary string to `router.push` is how an app
 * ends up opening whatever a payload asked for — so this matches against the
 * shapes the app actually emits and returns `null` for everything else,
 * including internal-looking paths nobody schedules.
 *
 * Pure, so `npm run test:domain` can throw hostile payloads at it without a
 * renderer or a notifications daemon.
 */

/** Ids are minted by `utils/id` and the mock; both stay inside this alphabet. */
const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The only destinations a notification may open, in the order they are tried. */
const ROUTES: { prefix: string; build: (id: string) => string }[] = [
  { prefix: '/reservation/', build: (id) => `/reservation/${id}` },
  { prefix: '/restaurant/', build: (id) => `/restaurant/${id}` },
];

/**
 * Resolves a notification payload to an in-app route, or `null`.
 *
 * The load-bearing line is `ID.test(id)`: it is what stops a query string, a
 * fragment or a second path segment riding along behind an id that would
 * otherwise pass. Rebuilding the path from that id rather than returning the
 * input is equivalent while the pattern stays this tight — it is here so the
 * *shape* of what comes out stays guaranteed by this function rather than by
 * the pattern, which is the part likely to be loosened one day.
 */
export function routeFor(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;

  const href = (data as { href?: unknown }).href;
  if (typeof href !== 'string') return null;

  // Somewhere that is not Mesa. Strictly redundant — "https://…" and
  // "//evil.example" match no prefix below either — and kept because the list
  // below is the thing that grows, and a route added carelessly should find
  // this already in its way rather than have to remember it.
  if (!href.startsWith('/') || href.startsWith('//')) return null;

  for (const route of ROUTES) {
    if (!href.startsWith(route.prefix)) continue;
    const id = href.slice(route.prefix.length);
    if (!ID.test(id)) return null;
    return route.build(id);
  }

  return null;
}
