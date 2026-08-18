/**
 * The 44pt floor, as arithmetic rather than as a promise.
 *
 * DESIGN.md has said since the first commit that controls rendering smaller
 * than 44×44 "carry a computed `hitSlop` that brings them there". Two of them
 * carried a hand-picked one instead, and hand-picked numbers are how a slot
 * pill ends up at 26pt tall with 8pt of slop — 42, near enough to look right in
 * a review and two short of the thing being promised. Those pills are the
 * fastest path to a booking in the app.
 *
 * Both iOS (44) and Android (48dp ≈ 44pt) ask for roughly this, and the
 * argument for it is not compliance: a target this size is what a thumb hits
 * while walking, which is when someone books a table.
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * The slop a control of this size needs on each edge to reach the floor.
 *
 * Returns a small positive value rather than zero for controls that are already
 * big enough, because a press that lands a pixel outside a large button should
 * still count.
 */
export function hitSlopFor(size: number, whenLargeEnough = 6): number {
  if (size >= MIN_TOUCH_TARGET) return whenLargeEnough;
  // Rounded up: half of an odd shortfall would land the pair a point short.
  return Math.ceil((MIN_TOUCH_TARGET - size) / 2);
}
