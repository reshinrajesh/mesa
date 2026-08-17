# Mesa

A café and restaurant reservation app for the diner, built with Expo, React Native and TypeScript.
It runs entirely on mock data: clone, install, start, and every screen works with no backend.

```bash
npm install
npm start          # then press i / a, or scan the QR with Expo Go
npm run verify     # typecheck + lint + 80 domain checks + 42 component and integration tests
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

---

## Signing in

There is no backend. The login screen prints this, and accepts:

| | |
|---|---|
| Email | `alex.marques@example.com` |
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

| State | How to reach it |
|---|---|
| Every `ErrorState` (Home, Explore, Bookings, restaurant, menu) | `EXPO_PUBLIC_MOCK_FAILURE_RATE=0.35 npm start` |
| Skeletons and optimistic updates | raise `config.mockLatency` |
| No favourites | un-heart the three seeded ones |
| No bookings | cancel the seeded ones |
| No search results | search for something absent, e.g. `zzz` |
| Empty inbox | dismiss each entry, or mark all read and clear them |
| Closed that day | pick a Monday at Osteria Grano |
| Nothing left today | browse after the last seating |
| Sold out, waitlist offered | an evening at a popular venue — ~2% of nights entirely, 10–25% at peak |
| Waitlist queued → offered → lapsed | the seeded entry, within a minute of first launch |
| A tapped notification opening what it is about | tap the waitlist alert, from the lock screen or a cold start |
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

Every bug in that first paragraph got through a green `npm run verify`. The 80 domain checks are
good at what they cover and structurally blind to the rest: a function that returns the right value
tells you nothing about whether a branch is on screen. So `npm test` renders. It is deliberately
small and deliberately about *which state is showing* rather than about markup or copy, because a
suite that fails whenever a word changes is a suite people delete. It asserts on accessibility labels
where it can, since those are both what a screen reader receives and the thing least likely to churn.

Every suite is mutation-tested rather than trusted: deleting the waitlist exemption from
`assertCancellable`, making a queueable slot `disabled` again, or sending empty filter arrays over
the wire each fails the relevant test. A passing suite that cannot fail is worse than no suite,
because it is believed.

Note for anyone adding to it: React Native Testing Library 14 made `render` **async** for React 19's
concurrent renderer. Without `await`, `screen` reports "render function has not been called" while
`render()` itself appears to succeed.

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
  services/       contracts.ts + one mock implementation per contract
  store/          five Zustand stores, deliberately separate
  hooks/          TanStack Query bindings, one file per domain
  features/       business logic: restaurants · recommendations · search · reservations · notifications
  components/     ui/ (design system) · restaurant/ · reservation/ · map/
  validation/     Zod schemas
  lib/            QueryClient + offline persister
```

The rule the layout enforces: **`app/` contains no business logic** — and neither does `services/`.
Filtering, sorting, opening hours, availability, recommendations, the waitlist and the rules
governing what may be booked all live in `src/features/` as pure functions, which is why 80 checks
can be executed by `npm run test:domain` with no renderer, no storage mock and no real clock.

What is left in a service is what a service is for: reading storage, writing storage, minting ids.
`reservationService` decides nothing; it calls `features/reservations/rules.ts` and persists the
result.

### Swapping in a real backend

`src/services/contracts.ts` is the seam. The UI depends on those interfaces and never on an
implementation, so `src/services/index.ts` is the only file that knows which one is in use:

```bash
EXPO_PUBLIC_USE_MOCK_SERVICES=false EXPO_PUBLIC_API_BASE_URL=http://localhost:4000 npm start
```

Restaurants and reservations are implemented — `restaurantService.http.ts` and
`reservationService.http.ts`, both against `request()` from `http.ts`, which handles timeout, abort,
bearer-token injection from SecureStore, and mapping every status onto an `AppError` that already
carries written copy. Auth, favourites, notifications, reviews and location are still mock-only; they
are the same exercise and go in the same place, and are absent rather than half-written.

The endpoints those two expect:

| | |
|---|---|
| `GET /restaurants` | `?query&sort&cursor&limit&cuisines&priceTiers&kinds&amenities&minRating&maxDistanceKm&openNow&lat&lng` — arrays comma-joined, empties omitted |
| `GET /restaurants/:id` · `/menu` · `/availability?date&guests` | one venue, its menu, one day's board |
| `GET /restaurants/suggestions?q` · `/collections?lat&lng` · `/map` | search suggestions, the home rails, raw pins |
| `GET /reservations` · `GET /reservations/:id` | the guest's own, bearer token required |
| `POST /reservations` · `PATCH /reservations/:id` · `POST /reservations/:id/cancel` | book, change, cancel |
| `POST /waitlist` · `POST /waitlist/:id/accept` | join a queue, take the table |

Reads of public data are sent unauthenticated on purpose, so browsing signed-out is the normal path
rather than a special case. Everything under `/reservations` and `/waitlist` carries the token.

**This is tested, not asserted.** `http.integration.test.ts` starts a real `node:http` server, points
the client at it and calls the actual service methods — a fetch mock would happily confirm a URL no
server could route and a header that never got sent. It covers the query flattening, the bearer
token, JSON round-tripping, path encoding, the mock/HTTP switch itself, and that a 409 becomes "That
time just went" while the provider's `PG::UndefinedTable` reaches the log and never the screen.

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
| Real backend | `services/contracts.ts` + `http.ts`, already written |
| Push notifications | `notificationService.registerForPush()`, currently an intentional no-op |
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
| `npm run test:domain` | 80 checks over the pure domain layer and the palette |
| `npm test` | 42 component and HTTP integration tests |
| `npm run verify` | all three |
| `npm run check:deps` | confirm every dependency matches the Expo SDK |

### Enabling real map tiles

The fallback map works everywhere. For street tiles, make a development build
(`npx expo prebuild && npm run ios`) and add a Google Maps key for Android under
`expo.android.config.googleMaps.apiKey` in `app.json`. That key is a client-restricted key, not a
secret — restrict it by package name and SHA-1 in the Google Cloud console.
