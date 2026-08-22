import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { log } from './log';

/**
 * Two storages, and the split is not a style choice.
 *
 * `secureStorage` is for anything that authenticates the user: access and
 * refresh tokens. It maps to the iOS keychain and Android EncryptedSharedPrefs.
 *
 * `storage` (AsyncStorage) is an unencrypted plaintext file. It holds
 * preferences, favourites and cached lists — things whose disclosure costs
 * nothing. Tokens must never go here, which is why the two have different
 * names and this comment sits between them.
 */

export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch (error) {
      log.warn('storage', `read failed for ${key}`, error);
      return fallback;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      log.warn('storage', `write failed for ${key}`, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      log.warn('storage', `delete failed for ${key}`, error);
    }
  },
};

/** SecureStore has no web implementation; the shim keeps dev-on-web working. */
const secureAvailable = Platform.OS === 'ios' || Platform.OS === 'android';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (!secureAvailable) return AsyncStorage.getItem(`insecure.${key}`);
    try {
      return await SecureStore.getItemAsync(key, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      log.warn('secure-storage', `read failed for ${key}`, error);
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (!secureAvailable) {
      await AsyncStorage.setItem(`insecure.${key}`, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error) {
      log.warn('secure-storage', `write failed for ${key}`, error);
    }
  },

  async remove(key: string): Promise<void> {
    if (!secureAvailable) {
      await AsyncStorage.removeItem(`insecure.${key}`);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      log.warn('secure-storage', `delete failed for ${key}`, error);
    }
  },
};

export const storageKeys = {
  favorites: 'mesa.favorites',
  recentlyViewed: 'mesa.recently-viewed',
  recentSearches: 'mesa.recent-searches',
  reservations: 'mesa.reservations',
  notifications: 'mesa.notifications',
  notificationPrefs: 'mesa.notification-prefs',
  user: 'mesa.user',
  session: 'mesa.session-kind',
  activeLocation: 'mesa.active-location',
  reviews: 'mesa.reviews',
  bills: 'mesa.bills',
  orders: 'mesa.orders',
  serviceStates: 'mesa.service-states',
} as const;

export const secureKeys = {
  accessToken: 'mesa.access-token',
  refreshToken: 'mesa.refresh-token',
} as const;
