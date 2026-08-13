# Mesa

A café and restaurant reservation app for the diner, built with Expo, React Native and TypeScript.
It runs entirely on mock data: clone, install, start, and every screen works with no backend.

```bash
npm install
npm start          # then press i / a, or scan the QR with Expo Go
npm run verify     # typecheck + lint + 39 domain checks
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

**Management.** Upcoming and past bookings with directions, modify, cancel, rebook and rate. Six
statuses, a two-hour change lock, optimistic cancel with rollback.

**The rest.** Favourites with local persistence, a profile with preferences and saved addresses,
a notification inbox with real local reminder scheduling, and full auth screens (welcome, sign in,
sign up, forgot password, OTP, Google/Apple, guest browsing) against a mock identity service.

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
bookings, one live waitlist entry, three past ones, five notifications. Seeds apply only when nothing
has ever been written — clearing your favourites and relaunching leaves them cleared.

The seeded waitlist entry starts two parties from the front, so within a minute of first launch it
reaches the head of the queue and a table is offered. That is the whole loop, without having to book
your way into it first.

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
  features/       business logic: restaurants · recommendations · search · reservations
  components/     ui/ (design system) · restaurant/ · reservation/ · map/
  validation/     Zod schemas
  lib/            QueryClient + offline persister
```

The rule the layout enforces: **`app/` contains no business logic.** Filtering, sorting, opening
hours, availability and recommendations all live in `src/features/` as pure functions, which is why
39 of them can be executed by `npm run test:domain` with no renderer involved.

### Swapping in a real backend

`src/services/contracts.ts` is the seam. The UI depends on those six interfaces and never on an
implementation. `src/services/http.ts` — the real client, with timeout, abort, bearer-token
injection from SecureStore and status-to-`AppError` mapping — is already written and wired.

To go live:

1. Add `restaurantService.http.ts` next to the mock, implementing `RestaurantService` via `request()`.
2. Switch the export in `src/services/index.ts` behind `config.useMockServices`.
3. Change nothing else. No screen, hook or store imports a mock module directly.

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

**Cards never advertise a slot the booking screen refuses.** The card strip and the booking board
read the same generator — verified by a domain check.

**A waitlist is arithmetic, not a timer.** An entry stores two things: where the guest started and
when. Where they are now, whether a table is being held and how long is left on the hold are all pure
functions of those plus the clock, in `features/reservations/waitlist.ts`. Nothing ticks a counter
down in the background, so backgrounding the app cannot freeze the queue, two renders cannot disagree
about the position, and the same function the screen used to draw the countdown is the one the
service uses to decide whether "Take the table" is still honest. Seven domain checks walk an entry
from queued to offered to lapsed with no renderer and no fake clock.

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
| `npm run test:domain` | 39 checks over the pure domain layer |
| `npm run verify` | all three |
| `npm run check:deps` | confirm every dependency matches the Expo SDK |

### Enabling real map tiles

The fallback map works everywhere. For street tiles, make a development build
(`npx expo prebuild && npm run ios`) and add a Google Maps key for Android under
`expo.android.config.googleMaps.apiKey` in `app.json`. That key is a client-restricted key, not a
secret — restrict it by package name and SHA-1 in the Google Cloud console.
