# Mesa

A café and restaurant reservation app for the diner, built with Expo, React Native and TypeScript.
It runs entirely on mock data: clone, install, start, and every screen works with no backend.

Scoped to India: the dataset is sixteen invented Bengaluru venues, prices are rupees grouped the
Indian way (`₹1,45,000`, not `₹145,000`), and the cuisine taxonomy is the one a diner here would
actually filter by — South Indian, biryani, chaat, coastal, Andhra, Kerala — rather than `indian`
as a single bucket that returns a tiffin room and a Mughlai grill equally badly.

```bash
npm install
npm start          # then press i / a, or scan the QR with Expo Go
npm run verify     # typecheck + lint + 98 domain checks + 168 component, screen, hook and service tests
```

---

## What is built

**Discovery.** Home with a location selector, greeting, cuisine categories and six rails
(free tonight, chosen for you, popular near you, trending cafés, top rated, just opened) plus
recently viewed. Explore with search, thirteen filters, five sort orders and a list/map toggle.
A dedicated search screen with debounced suggestions across restaurants, cuisines and neighbourhoods.

**Booking.** A five-step wizard (date → guests → time → seating → notes) into a review screen and a
confirmation carrying a QR code and a six-character door code. Slots are shown as available, limited,
waitlistable or unavailable, with the quiet ones marked and explained.

**Waitlists.** A full slot at a venue that keeps a list is joinable rather than dead. Joining files an
entry that shows its place in the queue, advances as parties ahead resolve, and turns into a real
offer — a table held for twenty minutes — announced by a scheduled local notification. Taking it
converts the entry into a confirmed booking with a code; letting it lapse keeps the place in line.
Cards say so before you commit to a venue: a restaurant with nothing left tonight shows a dashed
"Full tonight · waitlist" pill where its free times would be, rather than an empty space that reads
as no availability at all.

**Management.** Upcoming and past bookings with directions, modify, cancel, rebook and rate. Six
statuses, a two-hour change lock, optimistic cancel with rollback.

**The rest.** Favourites with local persistence, a profile with preferences and saved addresses,
a notification inbox with real local reminder scheduling, its own retention policy and taps that open
what they are about, and full auth screens (welcome, sign in, sign up, forgot password, OTP,
Google/Apple, guest browsing) against a mock identity service.

### Deliberately not built

Restaurant-owner tooling, payments and deposits — all out of scope for v1 and all called out below
in the extension points. Photo upload on the profile screen is absent rather than present-and-dead,
because storing a file needs a server. Adding a saved address is read-only for the same reason:
address search needs a keyed geocoding API.

The same rule caught two things that had already shipped. Settings offered a switch called "Offers
from restaurants" that was written to storage and read by nothing — offers come from a restaurant
through a server, and there is no server, so the only honest thing the client could do with the
preference was store it. And `Rating` carried an `onPhoto` variant for use over imagery that no
caller ever passed, which in turn was the only route to a palette token. Both are gone. A control
that controls nothing spends trust that a missing one does not, and a check now asserts that every
remaining notification preference changes what the app files.

---

## Real venues, when you want them

The sixteen venues are invented. `scripts/import-places.ts` replaces them with real
Bengaluru ones from the Google Places API:

```bash
GOOGLE_PLACES_API_KEY=... npx tsx scripts/import-places.ts            # ten neighbourhoods
GOOGLE_PLACES_API_KEY=... npx tsx scripts/import-places.ts --dry-run  # count them, write nothing
```

It writes `src/mock/places.generated.ts`, which `mock/restaurants.ts` prefers over the invented set
whenever it has anything in it. The key is read at build time only — it must never become an
`EXPO_PUBLIC_*` variable, which would ship it inside the bundle.

Three rules come with using somebody else's data, and each is enforced by something rather than
written down and hoped for.

**Do not commit what it writes.** Google permits caching Places content for thirty days; a
generated file in git is a cache with no expiry. So the file carries an `importedAt` stamp and a
domain check fails once it is older than that — a stale import breaks your build rather than
quietly going out of date. `git checkout src/mock/places.generated.ts` puts the empty stub back.

**Attribution shows on the venue screen.** "Venue details and rating from Google. Availability is
simulated" appears under the address whenever the imported dataset is in use, wired from the same
flag that switches the data.

**No invented review is ever attached to a real restaurant.** The app fabricates availability, queue
depth, menus and prices, and none of that is attributed to anybody. A review is: it carries a name,
a rating and an opinion, and under a real business that is somebody's reputation being written for
them. So `mockReviews` is empty whenever the dataset is real, the rating and review count come from
Google instead, and a domain check asserts both directions.

What Places will not give you is a menu, a photo, or a table. Menus and prices stay invented for
imported venues, and the availability under a real restaurant's name is this app's simulation —
which is what the attribution line says out loud.

---

## Signing in

There is no backend. The login screen prints this, and accepts:

| | |
|---|---|
| Email | `ananya.rao@example.com` |
| Password | `mesa1234` |
| OTP code | `482913` |

Any other email with an 8-character password also signs in, as does Google, Apple or
**Browse without an account**.

A fresh install seeds itself so nothing is empty on first run: three saved restaurants, two upcoming
bookings, one live waitlist entry, four past ones, five notifications. Seeds apply only when nothing
has ever been written — clearing your favourites and relaunching leaves them cleared.

The seeded waitlist entry starts two parties from the front, so within a minute of first launch it
reaches the head of the queue and a table is offered. That is the whole loop, without having to book
your way into it first.

---

## Seeing every state

A state that ships without ever having been on screen is not built, it is written. An audit found
three of them. `no-show` had a badge, a tone, an icon and copy, and nothing in the app could produce
it. Every `ErrorState` sat behind a failure rate you had to edit source to change. And nothing
settled a booking after its evening, so `completed` came only from the seed — which meant the entire
rating flow was unreachable for any booking a real user made, and the profile's "visited" count could
never rise above two. All three are fixed; this table is how the rest stays honest.

The same audit run over `NotificationKind` found the same thing again. Eight kinds shipped with an
icon and copy; two could be produced by anything the app did. `waitlist-offer` — a table held for
twenty minutes, the most time-critical row in Mesa — could be produced by nothing at all, not even
the seed, and neither could `reservation-modified`. Booking a table filed no inbox row while
accepting one off the waitlist did, so the same outcome left a record or no record depending on the
route taken. And one seeded row read "How was Blue Fig? A rating helps the next person decide" under
the kind `reservation-reminder` and an alarm-clock icon, because there was no kind for what it was —
so nothing in the app had ever asked anyone to rate anything. All of that is fixed, and a check now
asserts that every kind the inbox can draw is one something can produce.

| State | How to reach it |
|---|---|
| Every `ErrorState` (Home, Explore, Bookings, restaurant, menu) | `EXPO_PUBLIC_MOCK_FAILURE_RATE=0.35 npm start` |
| Skeletons and optimistic updates | raise `config.mockLatency` |
| No favourites | un-heart the three seeded ones |
| No bookings | cancel the seeded ones |
| No search results | search for something absent, e.g. `zzz` |
| Empty inbox | dismiss each entry, or mark all read and clear them |
| Closed that day | pick a Monday at Ilaya, or any day at Naru before Tuesday |
| Nothing left today | browse after the last seating |
| Sold out, waitlist offered | an evening at a popular venue — ~2% of nights entirely, 10–25% at peak |
| A full slot nobody has queued for yet | most sold-out sittings — the queue behind one is empty far more often than not |
| Waitlist queued → offered → lapsed | the seeded entry, within a minute of first launch |
| A tapped notification opening what it is about | tap the waitlist alert, from the lock screen or a cold start |
| Every notification kind | book, change and cancel a table; the rest arrive on their own |
| A rating request | four hours after a booking of your own, if you have not rated it |
| `no-show` | seeded, in Past bookings |
| `completed` and the Rate action | any booking of your own, four hours after its sitting |
| Two-hour change lock | book today's earliest slot, then open the booking |
| Distance line absent, map centred on the city | decline the location permission |
| `MapCanvas` instead of native tiles | the default in Expo Go |
| Photo monogram fallback | airplane mode — the imagery is remote |
| Offline cache | airplane mode after one successful load |
| Guest mode | **Browse without an account** |
| Dark theme, Reduce Motion | the OS settings |
| All of the above, faster to click through | `npm run web` |

Every state in that table is now reachable. The last one that was not — the empty inbox — was listed
here as a missing product decision rather than a bug, and the decision has since been made: an inbox
entry is a record of something that happened, not a task, so you may dismiss one (with an undo) or
clear the ones you have already read (behind a confirmation), and **nothing removes an unread entry
but you**. Not a bulk action, not age. Read entries expire after thirty days, counted from when they
were read rather than when they arrived, because a year-old note you opened last night is one you
have dealt with. The policy is five pure functions in `src/features/notifications/inbox.ts` and six
domain checks; the screen only draws it.

### Why there are component tests as well

Every bug in that first paragraph got through a green `npm run verify`. The 98 domain checks are
good at what they cover and structurally blind to the rest: a function that returns the right value
tells you nothing about whether a branch is on screen. So `npm test` renders. It is deliberately
small and deliberately about *which state is showing* rather than about markup or copy, because a
suite that fails whenever a word changes is a suite people delete. It asserts on accessibility labels
where it can, since those are both what a screen reader receives and the thing least likely to churn.

Every suite is mutation-tested rather than trusted: deleting the waitlist exemption from
`assertCancellable`, making a queueable slot `disabled` again, or sending empty filter arrays over
the wire each fails the relevant test. A passing suite that cannot fail is worse than no suite,
because it is believed.

That is not a formality. The inbox retention test was written, passed, and was then found to assert
nothing: it compared the stored value before and after, and an unconditional rewrite puts back a
byte-identical array. Rewriting it to watch the write itself took two more corrections — `jest.spyOn`
on AsyncStorage hands back the existing mock *with this test's own setup writes already in its
history*, and `toHaveBeenCalledWith(key, value)` never matches because AsyncStorage is called with a
third callback argument, so the negated assertion passed either way. Three plausible-looking
assertions in a row, none of which could fail. The version in the file now fails when the branch is
removed and when it is made unconditional, which is the only evidence worth having.

`notificationService.test.ts` is the third kind: it drives the real service against the real
AsyncStorage mock, because the pure rules are already proved by the domain checks and what is left
unproven is whether the service wrote the result back. `src/screens/` is the fourth: whole routes,
rendered with the providers the app gives them, over the real services and storage. That is the only
level at which "the bulk clear appears once something has been read", "a waitlist row offers a place
in the queue rather than directions to a table nobody is holding", and "the Rate action retires once
you have rated" are facts rather than intentions — each of those is decided by the screen, and none
of them is visible to a component test or a pure function.

Those files live under `src/` rather than beside the screens because they cannot live beside them:
expo-router builds its route table from `require.context(app, true, /.*\.[tj]sx?$/)`, so
`app/notifications.test.tsx` would ship in the bundle as a route called "notifications.test".

One screen fought back and is worth warning about. On Explore, opening the filter sheet and
committing a *changed* filter set corrupts React's `act` queue — "overlapping act() calls" — after
which every render in that Jest module returns an empty tree and every later test times out whatever
it asserts. Twenty-second waits prove it is a wedge rather than slowness.

The reproduction has since shrunk out of the screen entirely: fifteen lines with no Explore, no
`FlashList` and no map — mount `FilterSheet`, press a chip, commit the draft, twice. Bisecting
eliminated far more than it confirmed, and the eliminations are the useful part: not the number of
renders (five plain renders of Explore pass), not the modal, not `FlashList`, not gesture-handler,
not reanimated in `Pressable`, not the test harness, not the unmount, not the results query, and not
the store write on its own. What remains is the sheet plus a store write that re-renders its parent,
which is where the next attempt should start — inside `FilterSheet`, not inside Explore. The tests
are split across two files as a workaround, and one branch — the empty-list copy, which changes
depending on whether filters are to blame — is untested for that reason rather than by choice. `useInboxReconciliation.test.tsx` is the
fourth: the loop that files those rows writes, invalidates the query it just read, and is re-run by
that invalidation, so what stops it is that the rows it filed are no longer missing. That is a
convergence argument rather than a guard — the kind of thing that is either right or spins for ever
filing duplicates — and no pure check can see it. Removing the deduplication, the session gate, the
boot gate or the wake-up timer each fails exactly one of its five tests.

Note for anyone adding to it: React Native Testing Library 14 made `render` **async** for React 19's
concurrent renderer. Without `await`, `screen` reports "render function has not been called" while
`render()` itself appears to succeed. And never call `mockRestore` on an AsyncStorage method — those
mocks *are* the storage implementation, so restoring one leaves it returning `undefined` where the
next test expects a promise.

`npm run web` is on that list because it did not work either. `react-native-maps` cannot build for
web, and the runtime `try/catch` around it in `src/components/map/nativeMap.ts` does not help:
Metro resolves the dependency graph statically and follows a guarded `require` like any other. The
web target failed to bundle at all, despite the script and `react-native-web` both shipping.
`nativeMap.web.ts` shadows the module on web so the import never enters the graph — the same fallback
to `MapCanvas`, decided by the bundler instead of by a `catch`.

---

## Architecture

```
app/                         expo-router routes only, no logic
  (auth)/                    welcome · login · sign-up · forgot-password · otp
  (tabs)/                    home · explore · reservations · favorites · profile
  restaurant/[id]/           index · menu · reviews · photos
  reserve/[restaurantId]/    index (5-step wizard) · review · confirmation
  reservation/[id]/          index · edit
  profile/                   settings · edit · preferences · saved-places · help · legal
  search/ · map · location-picker · notifications

src/
  theme/          palette · tokens · typography · ThemeProvider (light/dark/system)
  types/          the domain vocabulary; everything else imports from here
  constants/      config · cuisines and labels · the one query-key factory
  utils/          date · format · geo · errors · storage · haptics · log · id
  mock/           restaurants · menus · reviews · seed · availability · images
  services/       contracts.ts + a mock and an HTTP implementation of each
  store/          five Zustand stores, deliberately separate
  hooks/          TanStack Query bindings, one file per domain
  features/       business logic: restaurants · recommendations · search · reservations · notifications
  components/     ui/ (design system) · restaurant/ · reservation/ · map/
  validation/     Zod schemas
  lib/            QueryClient + offline persister
```

The rule the layout enforces: **`app/` contains no business logic** — and neither does `services/`.
Filtering, sorting, opening hours, availability, recommendations, the waitlist and the rules
governing what may be booked all live in `src/features/` as pure functions, which is why 98 checks
can be executed by `npm run test:domain` with no renderer, no storage mock and no real clock.

What is left in a service is what a service is for: reading storage, writing storage, minting ids.
`reservationService` decides nothing; it calls `features/reservations/rules.ts` and persists the
result.

### Swapping in a real backend

`src/services/contracts.ts` is the seam. The UI depends on those interfaces and never on an
implementation, so `src/services/index.ts` is the only file that knows which one is in use:

```bash
EXPO_PUBLIC_USE_MOCK_SERVICES=false EXPO_PUBLIC_API_BASE_URL=http://localhost:8000 npm start
EXPO_PUBLIC_USE_MOCK_SERVICES=false EXPO_PUBLIC_API_BASE_URL=http://localhost:8000 npm run web
```

Run this way and it works: home and Explore draw the server's venues, and Bookings draws the
signed-in guest's own reservations. Two things bite on the way there, and neither is the app's
fault:

**A browser needs CORS and Frappe sends none by default.** Every request from `npm run web` is
blocked with no header in the response to explain why, which reads exactly like the API being down.
On the Frappe side, `bench --site <site> set-config -p allow_cors '["http://localhost:8081"]'` —
the backend README says the same thing next to the other affordances a demo site turns on.

**On web the bearer token is not in a keychain.** `expo-secure-store` has no web implementation, so
`secureStorage` falls back to AsyncStorage under an `insecure.` prefix — deliberate, and fine for
development on a machine you own. It is `localStorage` in a browser, so treat a web build as a demo
target rather than a way to sign real people in.

**Every contract has both implementations.** Each `*.http.ts` goes through `request()` from
`http.ts`, which handles timeout, abort, bearer-token injection from SecureStore, and mapping every
status onto an `AppError` that already carries written copy. `locationService` is the one exception
and always will be: it asks the OS for a permission and a coordinate, and no server knows where this
phone is. It is not missing from the list, it does not belong in it.

| | |
|---|---|
| `GET /restaurants` | `?query&sort&cursor&limit&cuisines&priceTiers&kinds&amenities&minRating&maxDistanceKm&openNow&lat&lng` — arrays comma-joined, empties omitted |
| `GET /restaurants/:id` · `/menu` · `/availability?date&guests` | one venue, its menu, one day's board |
| `GET /restaurants/suggestions?q` · `/collections?lat&lng` · `/map` | search suggestions, the home rails, raw pins |
| `GET /reservations` · `GET /reservations/:id` | the guest's own, bearer token required |
| `POST /reservations` · `PATCH /reservations/:id` · `POST /reservations/:id/cancel` | book, change, cancel |
| `POST /waitlist` · `POST /waitlist/:id/accept` | join a queue, take the table |
| `POST /auth/sign-in` · `/sign-up` · `/password-reset` · `/otp` · `/otp/verify` · `/provider/:name` | all unauthenticated; each returns `{ user, tokens }` |
| `POST /auth/sign-out` · `GET /auth/me` · `PATCH /auth/me` | end a session, resolve a token to a profile, edit one |
| `GET /favorites` · `PUT /favorites/:id` · `DELETE /favorites/:id` | saved ids; `PUT` because saving twice must equal saving once |
| `GET /restaurants/:id/reviews` · `/reviews/breakdown` · `POST /restaurants/:id/reviews` | reads public, writing carries the token |
| `GET /notifications` · `POST /notifications` | the inbox, and filing an entry into it |
| `POST /notifications/:id/read` · `/read-all` · `DELETE /notifications/:id` | read one, read all, dismiss one |
| `POST /notifications/clear-read` → `{ cleared }` · `POST /notifications/restore` | bulk clear, and undo by sending the entry back whole |
| `GET` · `PUT /notifications/preferences` · `POST /push/register` | preferences follow the account; the push token is registered against it |

Reads of public data are sent unauthenticated on purpose, so browsing signed-out is the normal path
rather than a special case. Everything else carries the token.

Three decisions are worth knowing before writing the server side. **Sign-out clears the device
whatever the response is** — a server session outliving the device's is housekeeping, and the reverse
is a live credential on a phone whose owner has just asked to be signed out. **Notifications are
split down the middle**: the inbox and the preferences are the server's, because they follow a guest
to a second device, while permissions and scheduling stay in `notificationDevice.ts` — a reminder for
tonight's table is fired by the OS from a phone that may be offline by then. That is why the device
module takes preferences as an argument instead of reading them: it is the one thing the two
implementations disagree about. And **the token/profile storage split lives in `session.ts`**, shared
by both auth services, because two copies of that rule would eventually drift, and the drift that
matters — a token written to plaintext AsyncStorage — is invisible until someone reads a rooted
device.

**This is tested, not asserted.** `http.integration.test.ts` starts a real `node:http` server, points
the client at it and calls the actual service methods — a fetch mock would happily confirm a URL no
server could route and a header that never got sent. It covers the query flattening, the bearer
token, JSON round-tripping, path encoding, the mock/HTTP switch itself, and that a 409 becomes "That
time just went" while the provider's `PG::UndefinedTable` reaches the log and never the screen.

**A refusal is named by the server, not guessed from its status.** There are seventeen `ErrorCode`s
and seven statuses worth mapping, so `slot-taken`, `no-availability`, `restaurant-unavailable`,
`reservation-locked`, `waitlist-closed` and `waitlist-duplicate` all arrive as 409 — and every one of
them used to read "That time just went", including the two about a queue, where no time went
anywhere. `waitlist-offer-expired` had no status of its own at all. So `request()` prefers a `code`
in the error body over the status, and falls back to the status when the body names nothing: an
older server, a proxy's own error page, or a fault that never reached the app's error handler. The
code is checked against the copy table rather than trusted, because a server naming its own code
decides which sentence the user reads. This is the one place the client gives way to the backend's
shape rather than the other way round, and it is the only one — no status code could have carried
the distinction.

It also holds the three decisions above: that a 500 from `/auth/sign-out` still clears the keychain,
that a dead preferences endpoint still schedules the reminder, and that no write carrying a token
reaches the plaintext store. And it asserts that both implementations of every contract expose the
same method names — TypeScript checks that at the seam and stops checking the moment someone reaches
for `as never`, and a method missing from one side is a screen that works against the mock and throws
against the server.

One thing the HTTP services deliberately do not do is run `features/reservations/rules.ts`. On a real
backend those checks are the server's — it owns the table inventory, and a client deciding for itself
whether a slot is free would be racing every other client in the restaurant. The rules stay in the
mock, which is playing the server's part, and stay pure so both can use them.

### State

Five stores, kept apart so a profile edit does not re-render every screen that only wants to know
whether someone is signed in:

| Store | Holds |
|---|---|
| `authStore` | session kind and the signed-in user |
| `favoritesStore` | saved ids, optimistic with rollback |
| `searchStore` | query, committed filters, the filter sheet's uncommitted draft, sort, view, recent searches |
| `reservationDraftStore` | the in-progress booking, which spans several screens |
| `uiStore` | active location, recently viewed, toasts |

Server-shaped data is TanStack Query's. Favourite state is layered onto cached results at render
time rather than written into the cache, so tapping a heart re-renders one card and nothing else.

---

## Decisions worth knowing about

**Booking is one screen, not five routes.** The spec listed date, guests, time and slot as separate
stack screens. Five pushed routes means five navigation animations to book a table, and going back
to change the party size unwinds everything after it. It is a wizard in one screen instead: back
steps backwards, hardware back does the same, and the review screen's rows jump straight to the step
that set them. Filters and cancel are likewise a sheet and a dialog rather than routes.

That decision exists only as behaviour — a `back()` that returns false looks identical to one that
navigates — so `src/screens/reserve.test.tsx` holds it: back walks the wizard backwards without the
router being touched, and only leaves once there is no step behind it. It also holds the two rules
about the progress bar, which are easy to lose: you may jump back to a step you have answered, and
the segments ahead of you are `disabled` rather than merely unstyled, so a screen reader is told
instead of finding out by pressing.

**Availability is deterministic.** `src/mock/availability.ts` seeds every slot from
`(restaurant, date, party size, time)`, so refetching does not reshuffle the board under the user
and the "that time just went" path is testable. The mock enforces the same rules the server will:
no booking in the past, no booking a full slot, no changes inside two hours.

**Some nights are simply gone.** Demand is a property of the *evening* — seeded on
`(restaurant, date)` and weighted by popularity and the weekend — not of each slot independently.
That distinction is not cosmetic. With independent rolls a ten-slot evening sold out about once in
ten thousand, which meant the waitlist, the "nothing free that day" empty state and the card's
no-slots branch were all unreachable: code that ships without ever having been seen. With demand on
the night, about 2% of venue-nights sell out entirely and 10–25% lose their whole 7–9pm window, both
concentrated in the rooms you would expect. A domain check asserts both bounds, because a mock that
never sells out and one that always does are equally useless.

**Cards never advertise a slot the booking screen refuses.** The card strip and the booking board
read the same generator — verified by a domain check.

**A waitlist is arithmetic, not a timer.** An entry stores two things: where the guest started and
when. Where they are now, whether a table is being held and how long is left on the hold are all pure
functions of those plus the clock, in `features/reservations/waitlist.ts`. Nothing ticks a counter
down in the background, so backgrounding the app cannot freeze the queue, two renders cannot disagree
about the position, and the same function the screen used to draw the countdown is the one the
service uses to decide whether "Take the table" is still honest. Seven domain checks walk an entry
from queued to offered to lapsed with no renderer and no fake clock.

**The rules take the clock as an argument.** Every rule in `features/reservations/rules.ts` — the
two-hour lock, "that slot is full", "one place per queue", "the hold has run out" — receives `now`
and the day's availability rather than reading a clock or fetching a board. That is what makes them
executable: a check can walk a booking up to the lock window, across it, and out the other side in
three lines, and the offer path can be tested at the millisecond before the hold lapses without
waiting twenty minutes. It is also what lets the same rules run against a real backend's
availability instead of the mock's.

**The inbox reconciles, it does not listen.** Half the inbox is about a moment passing rather than
about something the guest did: a table coming free, a sitting drawing near, an evening ending. None
of those can file a row when they happen, because the app is closed when they happen. So nothing
tries. `features/notifications/reconcile.ts` is given the bookings, the inbox as it stands and the
clock, and returns what should already be there — the same shape as the waitlist's arithmetic, and
idempotent by construction, since an entry is "missing" only while the inbox holds nothing like it.
Backgrounding the app cannot make it miss an event, and the wake-up is a timer set to the exact
instant of the next transition rather than a poll, because `nextDueAt` already knows when that is.
Six checks walk a booking from "tomorrow" through "in three hours" to "how was it?" without a
renderer, a timer or a real calendar.

**Every route the app writes down is checked against the filesystem.** expo-router types its own
paths, and stops the moment anyone reaches for a cast — `router.push(route as never)` appears twice
here, in the notification router and the inbox row, because a path assembled at runtime cannot be
typed. Both are on the path a *notification* opens, which nobody clicks during development and which
matters most when it is wrong: a dead link there is a table held for twenty minutes with no way to
reach it. So `src/screens/routes.test.ts` reads the route table off `app/` the way the bundler does
and matches every route literal in the source against it, segment by segment, so a concrete
`/reservation/rsv_grano_upcoming` in the seed is checked against `reservation/[id]` rather than
dismissed as unknown.

**A notification decides nothing about where it goes.** Every alert the app schedules carries an
`href`, and for a while nothing read it — tapping "a table just came free, confirm before the hold
runs out" opened the app wherever it happened to be, which is the one notification in Mesa with a
deadline attached leading nowhere. It is wired now, through `features/notifications/routing.ts`,
which is a **whitelist rather than a redirect**: it matches the two shapes the app actually emits and
returns null for everything else, including internal-looking paths nobody schedules. Today the client
writes that payload; the day `registerForPush` is finished, it comes from the network, and an app
that hands an arbitrary payload string to `router.push` opens whatever it was sent. Five domain
checks throw hostile payloads at it, and one of them asserts the other direction — that every href
the app itself files still resolves — because a gate the app's own notifications cannot pass is just
the original bug wearing a lock.

**A waitlist entry is a reservation, not a second kind of record.** It carries `status: 'waitlisted'`
and lives in the same list, the same detail screen and the same cancel path. The day it becomes a
table it is already the row the user has been watching. What it does not carry is a booking code:
there is no table yet, and printing one would hand someone something to present at a door that is not
expecting them.

**Distances are optional, not required.** Declining location permission is a normal outcome: the
distance line simply disappears, the map centres on the city, and nothing nags afterwards.

**Maps degrade instead of failing.** `react-native-maps` needs a development build and is absent
from Expo Go, so `src/components/map/nativeMap.ts` resolves it lazily inside a try/catch. Without it
the map falls back to `MapCanvas` — a real coordinate projection on the app's own paper, with the
same pins and interactions. The QR renderer degrades the same way, to the printed code.

**Errors never reach the user raw.** Services throw `AppError`, which carries a written title and
message. Provider text lives on `debugMessage`, which is logged and never rendered.

**Tokens are not in AsyncStorage.** `secureStorage` (keychain / EncryptedSharedPreferences) holds
access and refresh tokens; `storage` (plaintext AsyncStorage) holds preferences, favourites and
cached lists. There are no secrets in the bundle, and `src/constants/config.ts` says why there never
will be.

**Offline.** The query cache is persisted to AsyncStorage with a 24-hour window, successful queries
only. Mutations are deliberately not persisted — replaying a queued booking hours later, against a
table that has since gone, is worse than asking the user to retry.

---

## Design

See [DESIGN.md](./DESIGN.md). In short: warm paper canvas, near-black ink, one terracotta accent
spent rarely. Fraunces for names and titles, Instrument Sans for everything you read to operate the
app. Photography is the only source of colour. `src/theme/` is the single source of truth for every
token; nothing in the app hardcodes a colour or a spacing value.

Accessibility is built in rather than retrofitted: every pressable is at least 44×44 (via `hitSlop`
where it renders smaller), every variant carries its own dynamic-type ceiling, no status is signalled
by colour alone, and Reduce Motion swaps scale animations for opacity.

Three of those are now computed rather than intended. Contrast is measured against every ground a
colour can land on. Touch targets are measured on five rendered screens — which found the slot pills
on a restaurant card sitting at 42pt, two short of the floor this paragraph promises, on the fastest
path to a booking in the app. And every control that handles a press is required to carry a label and
a role, across six screens including the ones behind a modal.

Both audits are pointed at the auth and profile screens as well — thirteen routes where there is no
logic worth a test of its own but a great deal of chrome, and one render each serves both checks.
Nothing there is a defect either.

That audit found nothing, which is worth stating plainly rather than dressing up: the labels were
already there. It is a regression guard, not a discovery, and the value of it is that removing any
one label now fails the suite by name.

The remaining three promises in that section are computed as well, and the type scale gave up one
more defect: at the largest system text setting a restaurant name rendered *smaller* than the
sentence beneath it, because a per-variant ceiling is a multiplier and 19 × 1.4 is less than
15 × 1.8. Two other pairs inverted the same way. Every §9 promise is now arithmetic, and four of the
seven were wrong when first measured.

Contrast is arithmetic rather than assertion. `src/theme/contrast.ts` holds the WCAG formulas and six
of the domain checks walk every foreground against every ground it can land on — composited, so the
translucent half of the palette is measured as the eye receives it rather than as it was written.
That pass moved five palette values and two component decisions; DESIGN.md §9 has the table and the
before. The two colours still hardcoded are the QR code's black on white, which scanners want, and
they say so where they are written.

---

## Extension points

The foundation was built with these in mind. Each is additive:

| Feature | Where it goes |
|---|---|
| Real backend | `services/*.http.ts`, written and tested against a real socket |
| Push notifications | wired: `usePushRegistration` posts a token to `/push/register` for anyone who has already granted permission. The mock returns null; only the server side is missing |
| Payments, deposits | a new `paymentService` contract; the review screen has the slot for it |
| Loyalty, offers, coupons | `uiStore` ambient state + a rail on Home |
| AI recommendations | replace `scoreRestaurant` in `features/recommendations/engine.ts`, keep `reason` |
| Multi-city | `uiStore.location` already drives every query key |
| Owner dashboard | a separate route group; no customer code changes |

---

## Commands

| | |
|---|---|
| `npm start` | Expo dev server |
| `npm run ios` / `android` | native build (needed for real map tiles) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:domain` | 98 checks over the pure domain layer, the palette and the type scale |
| `npm test` | 168 component, screen, hook, service and HTTP integration tests |
| `npm run verify` | all three |
| `npm run check:deps` | confirm every dependency matches the Expo SDK |

`npm run verify` also runs on GitHub Actions for every push to `main` and every pull request
(`.github/workflows/verify.yml`). It had been the definition of "green" for this project while only
ever running when somebody remembered to run it, which makes it a habit rather than a gate.

### Enabling real map tiles

The fallback map works everywhere. For street tiles, make a development build
(`npx expo prebuild && npm run ios`) and add a Google Maps key for Android under
`expo.android.config.googleMaps.apiKey` in `app.json`. That key is a client-restricted key, not a
secret — restrict it by package name and SHA-1 in the Google Cloud console.
