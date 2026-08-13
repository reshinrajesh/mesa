/**
 * @jest-environment node
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';

import { config } from '@/constants/config';
import { isAppError } from '@/utils/errors';
import { reservationServiceHttp } from './reservationService.http';
import { restaurantServiceHttp } from './restaurantService.http';

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
  storageKeys: {},
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
});

const lastRequest = () => received[received.length - 1];

describe('restaurantServiceHttp', () => {
  it('reaches a real server and returns what it sent', async () => {
    reply = { status: 200, body: { items: [{ id: 'rst_grano' }], nextCursor: null, total: 1 } };

    const page = await restaurantServiceHttp.getRestaurants({});

    expect(page.total).toBe(1);
    expect(page.items[0].id).toBe('rst_grano');
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
    reply = { status: 200, body: { id: 'rst_grano' } };

    await restaurantServiceHttp.getRestaurantById('rst_grano');
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
      restaurantId: 'rst_grano',
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
      restaurantId: 'rst_grano',
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
      restaurantId: 'rst_grano',
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
  it('exports the HTTP services when mocks are off, and the mocks when they are on', () => {
    for (const useMockServices of [true, false]) {
      jest.isolateModules(() => {
        jest.doMock('@/constants/config', () => ({ config: { ...config, useMockServices } }));

        /* eslint-disable @typescript-eslint/no-require-imports */
        const services = require('./index');
        const http = require('./reservationService.http');
        const mock = require('./reservationService');
        /* eslint-enable @typescript-eslint/no-require-imports */

        expect(services.reservationService).toBe(
          useMockServices ? mock.reservationService : http.reservationServiceHttp,
        );
      });
    }
  });
});
