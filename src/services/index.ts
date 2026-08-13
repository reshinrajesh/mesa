/**
 * The service registry.
 *
 * This is the ONLY file that decides which implementation the app talks to.
 * When the backend lands, add `restaurantService.http.ts` next to the mock and
 * switch the export here behind `config.useMockServices`. No screen, hook or
 * store changes — they all import from `@/services`, typed against
 * `./contracts`.
 */

export { authService, DEMO_OTP } from './authService';
export { favoriteService } from './favoriteService';
export { notificationService, defaultNotificationPreferences } from './notificationService';
export { reservationService } from './reservationService';
export { restaurantService } from './restaurantService';
export { reviewService } from './reviewService';
export { locationService, fallbackLocation } from './locationService';
export type { ActiveLocation } from './locationService';
export * from './contracts';
