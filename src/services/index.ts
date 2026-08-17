import { config } from '@/constants/config';

import { authService as authServiceMock } from './authService';
import { authServiceHttp } from './authService.http';
import { favoriteService as favoriteServiceMock } from './favoriteService';
import { favoriteServiceHttp } from './favoriteService.http';
import { notificationService as notificationServiceMock } from './notificationService';
import { notificationServiceHttp } from './notificationService.http';
import { reservationService as reservationServiceMock } from './reservationService';
import { reservationServiceHttp } from './reservationService.http';
import { restaurantService as restaurantServiceMock } from './restaurantService';
import { restaurantServiceHttp } from './restaurantService.http';
import { reviewService as reviewServiceMock } from './reviewService';
import { reviewServiceHttp } from './reviewService.http';

/**
 * The service registry.
 *
 * This is the ONLY file that decides which implementation the app talks to. No
 * screen, hook or store imports a concrete service — they all import from
 * `@/services`, typed against `./contracts`, which is why the lines below can
 * change what the whole app is talking to without anything else moving.
 *
 * Set `EXPO_PUBLIC_USE_MOCK_SERVICES=false` (with `EXPO_PUBLIC_API_BASE_URL`
 * pointing somewhere real) to run against a backend. The endpoint shapes the
 * HTTP services expect are listed in the README.
 *
 * Every contract now has both implementations. `locationService` is the one
 * exception and always will be: it asks the OS for a permission and a
 * coordinate, and there is no server on earth that knows where this phone is.
 * It is not missing from the list below, it does not belong in it.
 */

export const restaurantService = config.useMockServices
  ? restaurantServiceMock
  : restaurantServiceHttp;

export const reservationService = config.useMockServices
  ? reservationServiceMock
  : reservationServiceHttp;

export const authService = config.useMockServices ? authServiceMock : authServiceHttp;

export const favoriteService = config.useMockServices ? favoriteServiceMock : favoriteServiceHttp;

export const notificationService = config.useMockServices
  ? notificationServiceMock
  : notificationServiceHttp;

export const reviewService = config.useMockServices ? reviewServiceMock : reviewServiceHttp;

export { DEMO_OTP } from './authService';
export { defaultNotificationPreferences } from './notificationService';
export { locationService, fallbackLocation } from './locationService';
export type { ActiveLocation } from './locationService';
export * from './contracts';
