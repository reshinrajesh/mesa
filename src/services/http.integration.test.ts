/**
 * @jest-environment node
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

import { config } from '@/constants/config';
import { isAppError } from '@/utils/errors';
import { secureStorage, storage } from '@/utils/storage';
import { authServiceHttp } from './authService.http';
import { favoriteServiceHttp } from './favoriteService.http';
import * as device from './notificationDevice';
import { notificationServiceHttp } from './notificationService.http';
import { reservationServiceHttp } from './reservationService.http';
import { restaurantServiceHttp } from './restaurantService.http';
import { reviewServiceHttp } from './reviewService.http';

/**
 * The backend seam, over a real socket.
 *
 * The README has claimed for four sessions that swapping in a real backend is a
 * one-file change. That claim was never executed — the HTTP services did not
 * exist, and `http.ts` had never made a request in its life. A promise about
 * architecture that nobody has run is a promise about architecture.
 *
 * So this test starts an actual HTTP server, points the client at it, and calls
 * the real service methods. It is not a fetch mock: a fetch mock would happily
 * confirm a URL that no server could route, a header that never got sent, and a
 * JSON body that was never serialised.
 *
 * The storage module is stubbed because it reaches for the iOS keychain, which
 * is the one thing here that genuinely cannot exist in Node. The token it hands
 * back is then asserted on the wire.
 */

jest.mock('@/utils/storage', () => ({
  secureStorage: {
    get: jest.fn().mockResolvedValue('test-access-token'),
    set: jest.fn(),
    remove: jest.fn(),
  },
  secureKeys: { accessToken: 'mesa.access-token', refreshToken: 'mesa.refresh-token' },
  storage: { get: jest.fn(), set: jest.fn(), remove: jest.fn() },
  // Real key names, because one of the assertions below is about *which*
  // storage a token ends up in.
  storageKeys: {
    user: 'mesa.user',
    session: 'mesa.session-kind',
    notifications: 'mesa.notifications',
    notificationPrefs: 'mesa.notification-prefs',
  },
}));

/**
 * The device half of notifications is mocked out, not exercised.
 *
 * It talks to `expo-notifications` and the Android channel API, neither of
 * which exists in Node — and neither of which is what this file is about. What
 * *is* about the seam is which preferences the HTTP service hands it, and that
 * is asserted below.
 */
jest.mock('./notificationDevice', () => ({
  requestPermission: jest.fn().mockResolvedValue(true),
  scheduleReservationReminder: jest.fn(),
  cancelReservationReminder: jest.fn(),
  scheduleWaitlistAlert: jest.fn(),
  cancelWaitlistAlert: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[xyz]' }),
}));

interface Received {
  method: string;
  path: string;
  query: URLSearchParams;
  authorization?: string;
  body: unknown;
}

let server: Server;
let received: Received[] = [];
/** What the next request should be answered with. */
let reply: { status: number; body: unknown } = { status: 200, body: {} };

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      const url = new URL(req.url ?? '/', 'http://localhost');
      received.push({
        method: req.method ?? '',
        path: url.pathname,
        query: url.searchParams,
        authorization: req.headers.authorization,
        body: raw ? JSON.parse(raw) : null,
      });
      res.writeHead(reply.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(reply.body));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  // `config` is `as const` for the type system's benefit; at runtime it is an
  // ordinary object, and `request()` reads the base URL at call time.
  (config as { apiBaseUrl: string }).apiBaseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

beforeEach(() => {
  received = [];
  reply = { status: 200, body: {} };
  jest.clearAllMocks();
  (secureStorage.get as jest.Mock).mockResolvedValue('test-access-token');
  (storage.get as jest.Mock).mockResolvedValue(undefined);
});

/** Everything ever written to the plaintext store, as strings. */
const plaintextWrites = () =>
  (storage.set as jest.Mock).mock.calls.map(([key, value]) => `${key}=${JSON.stringify(value)}`);

const lastRequest = () => received[received.length - 1];

describe('restaurantServiceHttp', () => {
  it('reaches a real server and returns what it sent', async () => {
    reply = { status: 200, body: { items: [{ id: 'rst_ilaya' }], nextCursor: null, total: 1 } };

    const page = await restaurantServiceHttp.getRestaurants({});

    expect(page.total).toBe(1);
    expect(page.items[0].id).toBe('rst_ilaya');
    expect(lastRequest().path).toBe('/restaurants');
  });

  it('flattens filters into a query string a server can actually route', async () => {
    reply = { status: 200, body: { items: [], nextCursor: null, total: 0 } };

    await restaurantServiceHttp.getRestaurants({
      query: 'pasta',
      sort: 'rating',
      origin: { latitude: 38.7, longitude: -9.1 },
      filters: {
        cuisines: ['italian', 'french'],
        priceTiers: [2, 3],
        minRating: 4,
        maxDistanceKm: null,
        openNow: true,
        kinds: [],
        amenities: [],
      },
    });

    const { query } = lastRequest();
    expect(query.get('query')).toBe('pasta');
    expect(query.get('cuisines')).toBe('italian,french');
    expect(query.get('priceTiers')).toBe('2,3');
    expect(query.get('openNow')).toBe('true');
    expect(query.get('lat')).toBe('38.7');
    // Empty arrays and null distances are dropped, not sent as "" or "null" —
    // a backend would read those as filters rather than as their absence.
    expect(query.has('kinds')).toBe(false);
    expect(query.has('amenities')).toBe(false);
    expect(query.has('maxDistanceKm')).toBe(false);
  });

  it('does not send credentials for public browsing', async () => {
    reply = { status: 200, body: { id: 'rst_ilaya' } };

    await restaurantServiceHttp.getRestaurantById('rst_ilaya');
    expect(lastRequest().authorization).toBeUndefined();
  });

  it('encodes ids into the path rather than trusting them', async () => {
    reply = { status: 200, body: { restaurantId: 'x', currency: 'EUR', sections: [] } };

    await restaurantServiceHttp.getMenu('rst/../admin');
    expect(lastRequest().path).toBe('/restaurants/rst%2F..%2Fadmin/menu');
  });
});

describe('reservationServiceHttp', () => {
  it('carries the bearer token from secure storage', async () => {
    reply = { status: 200, body: { items: [], nextCursor: null, total: 0 } };

    await reservationServiceHttp.getReservations();
    expect(lastRequest().authorization).toBe('Bearer test-access-token');
  });

  it('serialises a booking as JSON the server receives intact', async () => {
    reply = { status: 200, body: { id: 'rsv_1', status: 'confirmed' } };

    await reservationServiceHttp.createReservation({
      restaurantId: 'rst_ilaya',
      date: '2026-08-20',
      time: '19:30',
      partySize: 2,
      seating: 'window',
      occasion: 'anniversary',
      notes: 'Quiet table please',
    });

    const sent = lastRequest();
    expect(sent.method).toBe('POST');
    expect(sent.path).toBe('/reservations');
    expect(sent.body).toEqual({
      restaurantId: 'rst_ilaya',
      date: '2026-08-20',
      time: '19:30',
      partySize: 2,
      seating: 'window',
      occasion: 'anniversary',
      notes: 'Quiet table please',
    });
  });

  it('sends the waitlist verbs the mock also implements', async () => {
    reply = { status: 200, body: { id: 'wlt_1', status: 'waitlisted' } };

    await reservationServiceHttp.joinWaitlist({
      restaurantId: 'rst_ilaya',
      date: '2026-08-20',
      time: '19:30',
      partySize: 2,
      seating: 'any',
      occasion: 'none',
      notes: '',
    });
    expect(lastRequest().path).toBe('/waitlist');

    await reservationServiceHttp.acceptWaitlistOffer('wlt_1');
    expect(lastRequest()).toMatchObject({ method: 'POST', path: '/waitlist/wlt_1/accept' });
  });

  it('strips the id out of an update body rather than sending it twice', async () => {
    reply = { status: 200, body: { id: 'rsv_1' } };

    await reservationServiceHttp.updateReservation({ id: 'rsv_1', partySize: 4 });

    const sent = lastRequest();
    expect(sent.method).toBe('PATCH');
    expect(sent.path).toBe('/reservations/rsv_1');
    expect(sent.body).toEqual({ partySize: 4 });
  });
});

describe('authServiceHttp', () => {
  const CREDENTIALS = {
    user: { id: 'usr_1', name: 'Alex Marques', email: 'alex@example.com' },
    tokens: { accessToken: 'access-abc', refreshToken: 'refresh-xyz', expiresAt: 1 },
  };

  it('signs in unauthenticated, and puts the token where a token belongs', async () => {
    reply = { status: 200, body: CREDENTIALS };

    await authServiceHttp.signIn('  ALEX@Example.com ', 'mesa1234');

    // No stale bearer on a sign-in: a server that sees one has to decide which
    // identity the request is about, and the usual answer is a confusing 401.
    expect(lastRequest().authorization).toBeUndefined();
    expect(lastRequest().body).toEqual({ email: 'alex@example.com', password: 'mesa1234' });

    expect(secureStorage.set).toHaveBeenCalledWith('mesa.access-token', 'access-abc');
    expect(secureStorage.set).toHaveBeenCalledWith('mesa.refresh-token', 'refresh-xyz');

    // The rule the storage split exists for, asserted rather than trusted:
    // nothing carrying a token may be written to the plaintext store.
    for (const write of plaintextWrites()) {
      expect(write).not.toContain('access-abc');
      expect(write).not.toContain('refresh-xyz');
    }
  });

  it('clears the device even when the server refuses to sign out', async () => {
    reply = { status: 500, body: { message: 'session service unavailable' } };

    await expect(authServiceHttp.signOut()).resolves.toBeUndefined();

    // A server session outliving the device's is housekeeping. The reverse —
    // a live credential on a phone whose owner just signed out — is not.
    expect(secureStorage.remove).toHaveBeenCalledWith('mesa.access-token');
    expect(secureStorage.remove).toHaveBeenCalledWith('mesa.refresh-token');
    expect(storage.set).toHaveBeenCalledWith('mesa.session-kind', 'anonymous');
  });

  it('completes a session from the token when the cached profile is gone', async () => {
    (storage.get as jest.Mock).mockImplementation(async (key: string) =>
      key === 'mesa.session-kind' ? 'authenticated' : null,
    );
    reply = { status: 200, body: CREDENTIALS.user };

    const session = await authServiceHttp.restore();

    expect(lastRequest().path).toBe('/auth/me');
    expect(session).toEqual({ user: CREDENTIALS.user, kind: 'authenticated' });
  });

  it('gives up the session rather than restoring half of one', async () => {
    (storage.get as jest.Mock).mockImplementation(async (key: string) =>
      key === 'mesa.session-kind' ? 'authenticated' : null,
    );
    reply = { status: 401, body: { message: 'token expired' } };

    const session = await authServiceHttp.restore();

    expect(session).toEqual({ user: null, kind: 'anonymous' });
    expect(secureStorage.remove).toHaveBeenCalledWith('mesa.access-token');
  });
});

describe('favoriteServiceHttp', () => {
  it('saves idempotently and removes by path', async () => {
    reply = { status: 200, body: null };

    await favoriteServiceHttp.addFavorite('rst_ilaya');
    // PUT, not POST: an optimistic heart can fire twice on a flaky connection,
    // and saving a restaurant twice has to be the same outcome as once.
    expect(lastRequest()).toMatchObject({ method: 'PUT', path: '/favorites/rst_ilaya' });

    await favoriteServiceHttp.removeFavorite('rst/../admin');
    expect(lastRequest()).toMatchObject({
      method: 'DELETE',
      path: '/favorites/rst%2F..%2Fadmin',
    });
  });
});

describe('reviewServiceHttp', () => {
  it('reads reviews without credentials and writes them with', async () => {
    reply = { status: 200, body: { items: [], nextCursor: null, total: 0 } };
    await reviewServiceHttp.getReviews('rst_ilaya');
    expect(lastRequest().authorization).toBeUndefined();

    reply = { status: 200, body: { id: 'rev_1' } };
    await reviewServiceHttp.createReview({
      restaurantId: 'rst_ilaya',
      reservationId: 'rsv_1',
      rating: 5,
      body: 'Excellent',
      highlights: ['food'],
    });

    const sent = lastRequest();
    expect(sent.authorization).toBe('Bearer test-access-token');
    expect(sent.path).toBe('/restaurants/rst_ilaya/reviews');
    // The restaurant is in the path and the author is in the token, so neither
    // is repeated in the body where a client could disagree with them.
    // The reservation stays: it is which visit is being reviewed, and it is
    // what lets the server refuse a review of a table nobody sat at.
    expect(sent.body).toEqual({
      reservationId: 'rsv_1',
      rating: 5,
      body: 'Excellent',
      highlights: ['food'],
    });
  });
});

describe('notificationServiceHttp', () => {
  it('takes the cleared count from the server rather than counting locally', async () => {
    reply = { status: 200, body: { cleared: 3 } };

    // Another device may have read something since this one last looked, so
    // the toast has to say what actually went, not what this client expected.
    await expect(notificationServiceHttp.clearRead()).resolves.toBe(3);
    expect(lastRequest()).toMatchObject({ method: 'POST', path: '/notifications/clear-read' });
  });

  it('sends the whole entry back so an undo restores rather than re-files', async () => {
    reply = { status: 200, body: null };
    const entry = {
      id: 'ntf_1',
      kind: 'waitlist-offer' as const,
      title: 'A table at Osteria Grano',
      body: '7:30 PM for two just came free.',
      createdAt: '2026-08-17T10:00:00.000Z',
      readAt: null,
    };

    await notificationServiceHttp.restore(entry);

    expect(lastRequest().body).toEqual(entry);
  });

  it('still schedules a reminder when the preferences endpoint is down', async () => {
    reply = { status: 500, body: { message: 'preferences service unavailable' } };
    const reservation = { id: 'rsv_1', date: '2026-08-20', time: '19:30', partySize: 2 };

    await notificationServiceHttp.scheduleReservationReminder(
      reservation as never,
      'Osteria Grano',
    );

    // Booking is exactly when the network is least reliable — a request has
    // just succeeded, so the connection may be about to drop. Losing the
    // preference must not cost someone the reminder.
    expect(device.scheduleReservationReminder).toHaveBeenCalledWith(
      reservation,
      'Osteria Grano',
      expect.objectContaining({ reminders: true }),
    );
  });

  it('registers a push token against the account that asked for it', async () => {
    reply = { status: 200, body: null };

    await expect(notificationServiceHttp.registerForPush()).resolves.toBe(
      'ExponentPushToken[xyz]',
    );

    const sent = lastRequest();
    expect(sent).toMatchObject({ method: 'POST', path: '/push/register' });
    expect(sent.authorization).toBe('Bearer test-access-token');
  });
});

describe('error mapping', () => {
  /** The status a real booking race returns, and the copy the user must see. */
  it.each([
    [409, 'slot-taken', 'That time just went'],
    [404, 'not-found', 'We could not find that'],
    [401, 'unauthorized', 'Please sign in again'],
    [422, 'validation', 'Check the details'],
    [429, 'rate-limited', 'Slow down a moment'],
    [500, 'server', 'Something went wrong on our side'],
  ])('turns HTTP %i into %s with written copy', async (status, code, title) => {
    reply = { status, body: { message: 'raw provider detail with a stack trace' } };

    await expect(reservationServiceHttp.getReservationById('rsv_1')).rejects.toMatchObject({
      code,
      title,
    });
  });

  /**
   * The six refusals that share 409, and the one that had no status at all.
   *
   * Mapping by status alone told a guest who was already in a queue that the
   * time they wanted had just gone, and said the same about a venue that had
   * closed and a booking inside its change lock. The server names the code in
   * the body; the client reads it.
   */
  it.each([
    [409, 'waitlist-duplicate', 'You are already on this list'],
    [409, 'waitlist-closed', 'No waitlist for that time'],
    [409, 'reservation-locked', 'Too close to the booking'],
    [409, 'restaurant-unavailable', 'Not taking bookings'],
    [409, 'no-availability', 'Nothing free at that time'],
    [410, 'waitlist-offer-expired', 'That table has gone'],
  ])('lets the body name %i as %s', async (status, code, title) => {
    reply = { status, body: { code, message: 'raw provider detail' } };

    // The title as well as the code: the whole point is which sentence the
    // guest reads, and every one of these read "That time just went" before.
    await expect(reservationServiceHttp.getReservationById('rsv_1')).rejects.toMatchObject({
      code,
      title,
    });
  });

  it('keeps the status mapping when the body names nothing', async () => {
    // An older server, a proxy's own error page, or a fault that never reached
    // the app's error handler. The 409 default stays what it was.
    reply = { status: 409, body: { message: 'no code here' } };

    await expect(reservationServiceHttp.getReservationById('rsv_1')).rejects.toMatchObject({
      code: 'slot-taken',
    });
  });

  it('refuses a code it has no copy for', async () => {
    // A whitelist rather than a passthrough: an unrecognised code would render
    // an undefined title, and a server should not get to invent sentences.
    reply = { status: 409, body: { code: 'teapot-on-fire', message: 'invented' } };

    await expect(reservationServiceHttp.getReservationById('rsv_1')).rejects.toMatchObject({
      code: 'slot-taken',
    });

    reply = { status: 418, body: { code: { nested: 'object' } } };

    await expect(reservationServiceHttp.getReservationById('rsv_1')).rejects.toMatchObject({
      code: 'unknown',
    });
  });

  it('never lets provider text reach the user', async () => {
    reply = { status: 500, body: { message: 'PG::UndefinedTable at /api/reservations' } };

    try {
      await reservationServiceHttp.getReservations();
      throw new Error('expected the request to reject');
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      if (!isAppError(error)) return;
      // The rule the whole error vocabulary exists to enforce: the provider's
      // words go to the log, never to the screen.
      expect(error.message).not.toContain('PG::UndefinedTable');
      expect(error.debugMessage).toContain('PG::UndefinedTable');
    }
  });
});

describe('the switch', () => {
  /**
   * Every contract, both ways.
   *
   * Listed rather than derived, and that is the point: a seventh service added
   * to `contracts.ts` and wired into the registry with only one implementation
   * will not appear here, and the person adding it has to decide consciously
   * whether it belongs. The one deliberate absence is `locationService`, which
   * asks the OS where the phone is — there is no server answer to that.
   */
  const CONTRACTS = [
    ['restaurantService', './restaurantService', './restaurantService.http', 'restaurantServiceHttp'],
    ['reservationService', './reservationService', './reservationService.http', 'reservationServiceHttp'],
    ['authService', './authService', './authService.http', 'authServiceHttp'],
    ['favoriteService', './favoriteService', './favoriteService.http', 'favoriteServiceHttp'],
    ['notificationService', './notificationService', './notificationService.http', 'notificationServiceHttp'],
    ['reviewService', './reviewService', './reviewService.http', 'reviewServiceHttp'],
  ] as const;

  it('exports the HTTP services when mocks are off, and the mocks when they are on', () => {
    for (const useMockServices of [true, false]) {
      jest.isolateModules(() => {
        jest.doMock('@/constants/config', () => ({ config: { ...config, useMockServices } }));

        /* eslint-disable @typescript-eslint/no-require-imports */
        const services = require('./index');

        for (const [name, mockModule, httpModule, httpExport] of CONTRACTS) {
          const mock = require(mockModule)[name];
          const http = require(httpModule)[httpExport];
          expect(services[name]).toBe(useMockServices ? mock : http);
        }
        /* eslint-enable @typescript-eslint/no-require-imports */
      });
    }
  });

  it('gives every contract the same shape in both implementations', () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    for (const [name, mockModule, httpModule, httpExport] of CONTRACTS) {
      const mock = require(mockModule)[name];
      const http = require(httpModule)[httpExport];

      // TypeScript checks this at the seam and stops checking the moment
      // someone reaches for `as never` or a partial mock. A method missing from
      // one side is a screen that works against the mock and throws against the
      // server, which is the exact failure the seam exists to prevent.
      expect(Object.keys(http).sort()).toEqual(Object.keys(mock).sort());
    }
    /* eslint-enable @typescript-eslint/no-require-imports */
  });
});
