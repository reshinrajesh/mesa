import { config } from '@/constants/config';

import { reservationService as reservationServiceMock } from './reservationService';
import { reservationServiceHttp } from './reservationService.http';
import { restaurantService as restaurantServiceMock } from './restaurantService';
import { restaurantServiceHttp } from './restaurantService.http';

/**
 * The service registry.
 *
 * This is the ONLY file that decides which implementation the app talks to. No
 * screen, hook or store imports a concrete service — they all import from
 * `@/services`, typed against `./contracts`, which is why the line below can
 * change what the whole app is talking to without anything else moving.
 *
 * Set `EXPO_PUBLIC_USE_MOCK_SERVICES=false` (with `EXPO_PUBLIC_API_BASE_URL`
 * pointing somewhere real) to run against a backend. The endpoint shapes the
 * HTTP services expect are listed in the README.
 *
 * Auth, favourites, notifications, reviews and location are still mock-only.
 * Their HTTP counterparts are the same exercise and go in the same place; they
 * are absent rather than half-written, because a stub that returns nothing is
 * worse than an honest gap.
 */

export const restaurantService = config.useMockServices
  ? restaurantServiceMock
  : restaurantServiceHttp;

export const reservationService = config.useMockServices
  ? reservationServiceMock
  : reservationServiceHttp;

export { authService, DEMO_OTP } from './authService';
export { favoriteService } from './favoriteService';
export { notificationService, defaultNotificationPreferences } from './notificationService';
export { reviewService } from './reviewService';
export { locationService, fallbackLocation } from './locationService';
export type { ActiveLocation } from './locationService';
export * from './contracts';
