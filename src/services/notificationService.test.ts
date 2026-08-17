import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppNotification } from '@/types';

import { INBOX_RETENTION_MS } from '@/features/notifications/inbox';
import { storageKeys } from '@/utils/storage';
import { notificationService } from './notificationService';

/**
 * The seam between the inbox rules and the disk.
 *
 * `features/notifications/inbox.ts` is proved by the domain checks, but a pure
 * function that returns the right array says nothing about whether the service
 * wrote it back. Every method here reads storage, applies a rule and writes —
 * and the retention pass in particular has a branch (*write only when something
 * was actually removed*) that no pure check can see.
 *
 * Storage is the real AsyncStorage mock rather than a stub of this module, for
 * the same reason `http.integration.test.ts` starts a real server: a stub would
 * happily confirm a write that never reached a key anyone reads.
 */

const KEY = storageKeys.notifications;

function entry(id: string, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id,
    kind: 'reservation-reminder',
    title: id,
    body: '',
    createdAt: new Date('2026-08-17T10:00:00.000Z').toISOString(),
    readAt: null,
    ...overrides,
  };
}

/** Writes an inbox straight to disk, past the seeding path. */
async function given(items: AppNotification[]) {
  await AsyncStorage.setItem('mesa.notifications-seeded', JSON.stringify(true));
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

async function stored(): Promise<AppNotification[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as AppNotification[]) : [];
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('notificationService inbox', () => {
  it('seeds itself once, and not again after the inbox is emptied', async () => {
    const first = await notificationService.getNotifications();
    expect(first.items.length).toBeGreaterThan(0);

    for (const item of first.items) await notificationService.dismiss(item.id);

    // The seeding flag survives an empty inbox on purpose: re-seeding here
    // would resurrect everything the user just cleared.
    const second = await notificationService.getNotifications();
    expect(second.items).toHaveLength(0);
  });

  it('dismisses one entry and leaves the rest on disk', async () => {
    await given([entry('a'), entry('b'), entry('c')]);

    await notificationService.dismiss('b');

    expect((await stored()).map((n) => n.id)).toEqual(['a', 'c']);
  });

  it('clears read entries, reports how many went, and keeps the unread', async () => {
    await given([
      entry('read-1', { readAt: '2026-08-17T11:00:00.000Z' }),
      entry('unread'),
      entry('read-2', { readAt: '2026-08-17T11:00:00.000Z' }),
    ]);

    const cleared = await notificationService.clearRead();

    expect(cleared).toBe(2);
    expect((await stored()).map((n) => n.id)).toEqual(['unread']);
  });

  it('restores a dismissed entry in date order rather than at the top', async () => {
    const middle = entry('middle', { createdAt: '2026-08-17T09:00:00.000Z' });
    await given([entry('newest', { createdAt: '2026-08-17T12:00:00.000Z' }), middle]);

    await notificationService.dismiss('middle');
    await notificationService.restore(middle);

    // 'middle' is older than 'newest', so a restore that simply prepended would
    // put it at the top and the undo would read as a new notification.
    expect((await stored()).map((n) => n.id)).toEqual(['newest', 'middle']);
  });

  it('drops read entries past the retention window when the inbox is read', async () => {
    const longAgo = new Date(Date.now() - INBOX_RETENTION_MS - 60_000).toISOString();
    await given([entry('stale', { readAt: longAgo }), entry('kept')]);

    const page = await notificationService.getNotifications();

    expect(page.items.map((n) => n.id)).toEqual(['kept']);
    // Written back, not merely filtered on the way out: the next read must not
    // have to do the same work, and nothing else prunes the key.
    expect((await stored()).map((n) => n.id)).toEqual(['kept']);
  });

  it('leaves storage untouched when retention removes nothing', async () => {
    await given([entry('kept')]);

    // Spying on the write rather than comparing the contents afterwards: an
    // unconditional rewrite puts back a byte-identical array, so a content
    // comparison passes whether or not the branch exists. This is the branch
    // no pure check can see — an ordinary read of an ordinary inbox must not
    // write to disk at all.
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    // AsyncStorage's methods are already jest mocks, so spying on one hands
    // back the existing mock with its history — including this test's own
    // setup writes, which look exactly like the ones being watched for.
    setItem.mockClear();

    await notificationService.getNotifications();

    // Filtering the recorded calls rather than `toHaveBeenCalledWith`, which
    // matches on the whole argument list: AsyncStorage passes a third callback
    // argument, so a two-argument matcher never matches and the negated
    // assertion passes whether or not the write happened.
    expect(setItem.mock.calls.filter((call) => call[0] === KEY)).toHaveLength(0);
    // Cleared, never restored: these methods *are* the storage mock's
    // implementation, and `mockRestore` on one leaves it returning undefined
    // where the next test expects a promise.
    setItem.mockClear();
  });

  it('files a new entry unread, at the top, with an id of its own', async () => {
    await given([entry('existing')]);

    const filed = await notificationService.record({
      kind: 'waitlist-offer',
      title: 'A table at Osteria Grano',
      body: '7:30 PM for two just came free.',
      href: '/reservation/rsv_1',
      reservationId: 'rsv_1',
    });

    expect(filed.readAt).toBeNull();
    expect(filed.id).toBeTruthy();
    expect((await stored()).map((n) => n.id)).toEqual([filed.id, 'existing']);
  });

  it('marks one read without touching the others', async () => {
    await given([entry('a'), entry('b')]);

    await notificationService.markRead('a');

    const after = await stored();
    expect(after.find((n) => n.id === 'a')?.readAt).not.toBeNull();
    expect(after.find((n) => n.id === 'b')?.readAt).toBeNull();
  });
});
