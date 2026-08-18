import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Every route the app navigates to has to exist.
 *
 * expo-router's typed routes catch most of this at compile time, and stop the
 * moment anyone reaches for a cast — `router.push(route as never)` is in this
 * codebase twice, in the notification router and the inbox row, because a path
 * assembled at runtime cannot be typed. Both are the paths a *notification*
 * opens, which are the ones nobody clicks during development and the ones that
 * matter most when they are wrong: a dead link there is a table held for twenty
 * minutes with no way to reach it.
 *
 * So this reads the route table off the filesystem the way the bundler does and
 * compares it against every route literal in the source.
 */

const ROOT = join(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * A path both sides can be compared in.
 *
 * Group segments vanish — `(tabs)/explore` and `explore` are the same screen,
 * and the app writes it both ways — and every dynamic segment collapses to one
 * marker, since `[id]`, `${reservation.id}` and `[restaurantId]` are all "some
 * id goes here".
 */
function normalise(path: string): string {
  return (
    path
      .replace(/\\/g, '/')
      .replace(/\$\{[^}]+\}/g, ':param')
      .replace(/\[[^\]]+\]/g, ':param')
      .split('/')
      .filter((segment) => segment.length > 0 && !/^\(.+\)$/.test(segment))
      .join('/')
      .replace(/\/index$/, '')
      .replace(/^index$/, '') || '/'
  );
}

const ROUTES = new Set(
  walk(join(ROOT, 'app'))
    .filter((file) => /\.tsx$/.test(file))
    .map((file) => relative(join(ROOT, 'app'), file).split(sep).join('/'))
    .filter((file) => !file.includes('_layout') && !file.startsWith('+'))
    .map((file) => normalise(file.replace(/\.tsx$/, ''))),
);

/** Route literals, from the three shapes the app writes them in. */
function referencedRoutes(): { route: string; file: string }[] {
  const sources = [...walk(join(ROOT, 'app')), ...walk(join(ROOT, 'src'))].filter(
    (file) => /\.tsx?$/.test(file) && !file.includes('.test.'),
  );

  const pattern = /(?:router\.(?:push|replace)\(|pathname:\s*|href:\s*)['"`](\/[^'"`]*)['"`]/g;
  const found: { route: string; file: string }[] = [];

  for (const file of sources) {
    const contents = readFileSync(file, 'utf8');
    for (const match of contents.matchAll(pattern)) {
      found.push({ route: normalise(match[1]), file: relative(ROOT, file) });
    }
  }
  return found;
}

/**
 * Does a written path land on a route file?
 *
 * Segment-wise rather than by string equality, because the app writes both
 * shapes: `/reserve/[restaurantId]/review` is a pattern, and the seeded inbox
 * carries `/reservation/rsv_grano_upcoming`, a concrete instance of one. Both
 * resolve at runtime, and the second is the one a notification actually opens.
 */
function resolves(reference: string): boolean {
  const parts = reference.split('/');
  for (const route of ROUTES) {
    const target = route.split('/');
    if (target.length !== parts.length) continue;
    if (target.every((segment, i) => segment === ':param' || segment === parts[i])) return true;
  }
  return false;
}

describe('routes', () => {
  it('reads a route table that looks like the app', () => {
    // The guard first: everything below passes trivially against an empty set
    // on one side and an over-eager matcher on the other.
    expect(ROUTES.size).toBeGreaterThan(20);
    expect(ROUTES).toContain('restaurant/:param');
    expect(ROUTES).toContain('reserve/:param/review');
    expect(referencedRoutes().length).toBeGreaterThan(20);
  });

  it('never navigates somewhere that does not exist', () => {
    const dead = referencedRoutes().filter(({ route }) => !resolves(route));

    // The offenders are the assertion's own value, so a failure names the path
    // and the file it was written in rather than only a count.
    expect(dead.map(({ route, file }) => `${route} has no route file (from ${file})`)).toEqual([]);
  });

  it('files notifications that lead to a real screen', () => {
    // The two `as never` casts live on this path, so the compiler is not
    // watching it. `routeFor` rebuilds these from a validated id.
    for (const route of ['reservation/:param', 'restaurant/:param']) {
      expect(ROUTES).toContain(route);
    }
  });
});
