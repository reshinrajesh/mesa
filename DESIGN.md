# DESIGN.md

The design system for Mesa.

`src/theme/` is the code and the only source of truth. This document is the reasoning behind it.
When the two disagree, fix whichever is wrong — do not let them drift.

---

## 1. Visual thesis

**Warm editorial ink.** Off-white paper canvas, near-black ink, one saturated terracotta accent.
A serif with personality carries restaurant names; a geometric sans carries every piece of chrome.
Photography does all of the colour work.

The user is usually standing up, deciding where to eat in the next two hours. That makes this a
**utility surface, not a marketing one**: no hero, no value proposition, no gradient. Every screen
orients you, shows status, and enables one action.

Density is moderate — generous enough to scan one-handed on a bus, tight enough that six restaurants
fit a screen in the list view.

---

## 2. Colour

Light is the primary scheme; dark is a full peer, not a tint pass. Tokens live in
`src/theme/palette.ts`.

| Token | Light | Dark | Role |
|---|---|---|---|
| `canvas` | `#FAF7F2` | `#141110` | Screen background |
| `canvasSunk` | `#F1EBE1` | `#0C0A09` | Recessed: inset fields, image placeholders, icon chips |
| `surface` | `#FFFFFF` | `#1E1A17` | Cards and sheets |
| `ink` | `#1A1613` | `#F4EFE7` | Headings, values, primary button fill |
| `inkMuted` | `#5D544A` | `#ADA398` | Body copy and metadata |
| `inkFaint` | `#71695F` | `#92887D` | De-emphasised metadata, placeholders |
| `hairline` | ink @ 10% | ink @ 12% | Separators and card borders |
| `accent` | `#A34727` | `#E4774E` | The one live thing on the screen |
| `positive` | `#2E6B4C` | `#6FBE92` | Confirmed, open now, available |
| `warning` | `#895912` | `#DFA65E` | Awaiting venue, closing soon, limited |
| `danger` | `#A93326` | `#E8796B` | Cancelled, no-show, destructive |
| `photoChip` / `photoBadge` | ink @ 52% / 72% | same | Grounds for a glyph, and for words, on a photo |

The photo grounds are the only tokens identical in both schemes: a photograph does not know which
theme it landed in. Every value above is the output of the contrast checks in §9, not a swatch.

### Three rules the palette exists to enforce

**The canvas is warm paper, never white.** Cards are white and separate from the canvas by a
lightness step, not by a shadow. On this ground Android renders elevation as a grey halo, so ordinary
cards are flat: `surface` on `canvas` plus a hairline. Shadows are reserved for things that genuinely
float — bottom sheets, the sticky CTA, the map preview card.

**There is exactly one accent, and it is rationed.** Terracotta means *this is the live thing here*:
the selected time slot, an active favourite, the recommendation reason, the unread dot. **At most one
accent-filled element per viewport.** If two appear, one is decoration and should be neutral.

This is why the primary button is **ink, not accent**. If every CTA were terracotta, the accent would
stop meaning anything and the selected slot would lose its only signal.

The one place that rule is spent deliberately is a **waitlist offer**. A table being held for twenty
minutes is the only thing in the app that expires while you look at it, so the card takes the accent
ground, the accent border and the accent countdown at once, and the row for it in Bookings takes an
accent badge as well. It is the largest accent spend in the app because it is the only state that
costs the user something to miss. Everywhere else in a waitlist — queued, lapsed — is deliberately
neutral: nothing is happening, and dressing it up would make the offer indistinguishable from the
wait.

**Colour never carries meaning alone.** Every status ships with a word or an icon. Selected chips get
a checkmark as well as a fill. Unavailable slots are struck through as well as dimmed. Unread
notifications carry a dot as well as heavier type. A waitlistable slot is **dashed** as well as
recessed, and carries the word "Waitlist" under the time — it has to read as a different kind of
object from a bookable slot from across the board, before any label is read, because a full slot that
merely looked bookable would have people queueing while believing they had booked.

---

## 3. Typography

Two families, six sizes. `src/theme/typography.ts`.

**Fraunces** (serif) is the voice: screen titles and restaurant names.
**Instrument Sans** is the chrome: everything you read to operate the app.

| Variant | Size / line | Family | Use |
|---|---|---|---|
| `display` | 34 / 39, −0.7 | Fraunces SemiBold | The home greeting. Effectively one per app. |
| `title` | 26 / 31, −0.4 | Fraunces SemiBold | Screen titles. One per screen. |
| `heading` | 19 / 24, −0.2 | Fraunces SemiBold | Restaurant names, section headers |
| `subheading` | 16 / 21 | Instrument Sans SemiBold | Sans counterpart for form groupings |
| `body` / `bodyStrong` | 15 / 21 | Instrument Sans Regular / SemiBold | Everything else |
| `label` | 13 / 17 | Instrument Sans Medium | Buttons, chips, metadata |
| `caption` | 12 / 16 | Instrument Sans Regular | Supporting lines |
| `overline` | 11 / 14, +0.9, caps | Instrument Sans SemiBold | Section eyebrows |
| `numeric` | 13 / 17, tabular | Instrument Sans SemiBold | Ratings, prices, distances |

**Weight is always chosen by picking a family, never by setting `fontWeight`.** Android does not
reliably synthesise a bold from a custom family: `fontWeight: '600'` on `Fraunces_400Regular`
silently renders regular there and semibold on iOS, a divergence invisible in the simulator. Nothing
in the app sets `fontWeight`.

`numeric` is tabular so a column of ratings or distances does not jitter as the list scrolls.

**Dynamic type is capped per variant**, not globally. Body copy scales to 1.8×; a 34pt display line
at 2× would destroy every card, so it caps at 1.3×.

---

## 4. Spacing, radius, motion

4pt grid: `xxs 2 · xs 4 · sm 8 · md 12 · base 16 · lg 20 · xl 24 · xxl 32 · xxxl 40 · huge 56`.
Screen gutter is 20. Components use tokens, never raw numbers.

Radius: `xs 6 · sm 10 · md 14 · lg 18 · xl 24 · pill`. Moderate — this is an editorial surface, not
a rounded-bubble one. Photos take `md`, cards `lg`, sheets `xl`, buttons and chips `pill`.

Motion durations: `instant 110 · fast 160 · base 240 · slow 360`, standard ease-out `[0.22, 1, 0.36, 1]`.

---

## 5. Interaction thesis

**The signature is the rail peek.** Horizontal rails compute their card width so the *next* card is
always partly visible past the right gutter. A row that ends flush at the screen edge looks like a
complete set, and people do not swipe it. Snapping is to the card pitch so a flick lands cleanly.

**Every pressable moves on press-in, not on hover.** Touch has no hover; a control that only responds
to hover never acknowledges the tap. `Pressable` scales to 0.97 in 110ms — fast enough to read as the
finger's own doing. Reduce Motion swaps it for an opacity change.

**The sticky CTA hides on scroll-down, returns on scroll-up**, with a 12px dead zone so it does not
flicker on the jitter a finger produces while reading. It is always visible in the first 40px.

**Some things deliberately do not animate.** Frequency decides:

- Bottom tabs: tapped dozens of times a session. Instant state change, no icon animation.
- The segmented control's selected pill: no sliding indicator. Motion here reads as lag.
- Skeletons: a slow opacity pulse, not a sweeping gradient — twelve gradient layers cost more than
  the content they stand in for.

The one piece of purely decorative motion is the favourite heart's overshoot, and it is there because
that is the one control people tap for the pleasure of it.

**One countdown exists, and it had to earn it.** A number that changes on its own pulls the eye every
time it moves, which is why nothing else in the app counts anything down — a booking three days away
says "in 3 days" and leaves it there. The held-table countdown is the exception because the thing it
measures genuinely runs out: at zero the table goes to someone else. It refreshes every five seconds
rather than every second (minutes are what is displayed, and a per-second timer would burn a wake-up
for a digit that changes sixty times less often), it never rounds down to "0 minutes" while the
button beside it still works, and it is not a live region — a screen reader interrupting every few
seconds to re-read a queue position is worse than silence, and the offer announces itself as a system
notification instead.

**Haptics are rationed.** They confirm a state change *the user caused* — a slot selected, a
favourite added, a booking confirmed. Never on scroll, render or navigation. A phone that buzzes
while you browse is a phone people turn haptics off on.

---

## 6. Components

`src/components/ui/` — Text, Pressable, Button, Chip, Badge, Card, Divider, Input, Screen,
ScreenHeader, Sheet, ConfirmDialog, ToastHost, SmartImage, SectionHeader, Rating, StarPicker,
ListRow, SegmentedControl, Stepper, Skeleton, EmptyState, ErrorState.

Notes on the ones with opinions:

- **`SmartImage`** — every photo in the app. A design leaning this hard on imagery cannot afford a
  grey rectangle when a URL fails, so failures fall back to a warm card with the venue's initials in
  the display serif. Caching is `memory-disk` via `expo-image`.
- **`Input`** — the error line is reserved space, not a conditional row, so validating a form does not
  shunt every field below it down the screen while the user is typing.
- **`ConfirmDialog`** — not `Alert.alert`, because the system dialog cannot show a *loading* confirm
  button, so a slow cancellation would leave the user tapping "Cancel booking" twice. Destructive
  actions state what happens ("Cancel booking"), never "OK".
- **`Sheet`** — drag-to-dismiss commits past a third of the sheet height or on a fast flick. A sheet
  that closes on a 20px accidental drag loses the user's filter selections.
- **`ToastHost`** — toasts enter from the *top*. The bottom is where the tab bar and the reserve CTA
  live; covering the primary action to announce success is backwards.
- **`EmptyState`** — always names the next move. "No favourites yet" alone is a dead end.

---

## 7. Do / don't

**Do**

- Reach for a token. `theme.spacing.base`, not `16`.
- Give a status a word as well as a colour.
- Let a metadata row drop a missing field (`joinMeta`) rather than render a dangling separator.
- Hard-trim text to a whole word (`trimToWords`) in fixed-width slots.

**Don't**

- Add a shadow to an ordinary card. Use the background step.
- Use the accent for anything that is not the one live element on that screen.
- Set `fontWeight`. Pick a family variant.
- Truncate a metric or a label into an ellipsis — compact the format instead.
- Animate anything triggered by the keyboard, or anything tapped hundreds of times a day.
- Animate `width`, `height`, `top` or `left`. Transform and opacity only.

---

## 8. Responsive and safe area

Everything is fluid: rails compute card width from `Dimensions`, the photo grid divides the gutter,
the list is a `FlashList`. Nothing is pinned to a fixed screen width.

`Screen` owns safe-area insets, with `edgeTop` off for screens whose hero runs under the notch and
`keyboardSafe` on for anything with a text field (padding on iOS only — Android resizes the window
itself and adding padding double-counts). Sticky footers add `insets.bottom` themselves.

---

## 9. Accessibility

Non-negotiable, and enforced in the primitives rather than screen by screen:

- **44×44 minimum.** Controls that render smaller carry a computed `hitSlop` that brings them there.
  `Button` does this arithmetic from its own height.
- **Every interactive element has a role, a label and a state.** Slots announce "7:30 PM, 2 tables
  left" or "7:30 PM, fully booked"; unavailable slots are `disabled` so a screen reader says so
  instead of letting someone tap a dead pill.
- **Dynamic type**, capped per variant (§3).
- **Reduce Motion** respected via `useReduceMotion`, wired into `Pressable`, `Skeleton` and the
  wizard's step transitions.
- **Contrast, computed rather than claimed.** This bullet used to promise ~11:1 body text and an
  accent that cleared 4.5:1. Both were wrong — body copy was 6.9:1, and the light accent was 4.19:1
  on the canvas, 4.48:1 under the white label of the primary button. Nothing checked, so nothing
  caught it. `src/theme/contrast.ts` now holds the WCAG formulas and `npm run test:domain` walks
  every foreground against every ground it can land on, alpha composited, in both schemes:

  | | light | dark |
  |---|---|---|
  | Headings (`ink`) | 16.8:1 | 16.4:1 |
  | Body (`inkMuted`) | 6.9:1 | 7.6:1 |
  | Metadata and placeholders (`inkFaint`) | 5.1:1 | 5.4:1 |
  | Accent as text | 5.6:1 | 6.3:1 |
  | Accent inside its own chip, on the sunk canvas | 4.6:1 | 6.0:1 |
  | Label on an accent fill | 6.0:1 | 6.3:1 |
  | Words on a photo badge, over a white plate | 7.3:1 | 7.3:1 |
  | A glyph on a photo chip, over a white plate | 3.6:1 | 3.6:1 |

  Getting there moved five values. The accent deepened to `#A34727` and the amber to `#895912`; both
  faint tiers came in; the soft fills dropped to 8% (light) and 10% (dark), because a tone is drawn
  *on* a tint of itself and every point of alpha pulls the ground toward the foreground. The binding
  case in the whole app is an accent chip on `canvasSunk` at 4.6:1 — one point of margin, and the
  reason the terracotta is deeper than it was.

  Two things the arithmetic decided rather than confirmed. The photo chip went from 45% to 52%
  opacity: a glyph over a bright photo measured 2.9:1, under the 3:1 WCAG asks of a control. And the
  saved heart is white on photography instead of terracotta, because a chip over a bright photo lands
  mid-grey and *no* mid-tone accent clears 3:1 there. The state is carried by the glyph filling in,
  which is the §2 rule anyway: colour never carries meaning alone.
- **Live regions** on validation errors and toasts.
- **Decorative images carry an empty label** so a screen reader does not read a filename; the
  container above them carries the real one.
