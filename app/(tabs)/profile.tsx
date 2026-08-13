import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  ConfirmDialog,
  Divider,
  ListRow,
  Pressable,
  Screen,
  SmartImage,
  Text,
} from '@/components/ui';
import { CUISINE_LABEL } from '@/constants/cuisines';
import { useNotifications } from '@/hooks/useNotifications';
import { useReservations } from '@/hooks/useReservations';
import { useAuthStore } from '@/store/authStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { useTheme } from '@/theme';
import { initialsOf } from '@/utils/format';

/**
 * Profile.
 *
 * Guests see the same screen with a sign-in prompt at the top instead of an
 * identity card. Hiding the tab entirely for guests would make the app feel
 * like it has fewer features than it does.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const kind = useAuthStore((s) => s.kind);
  const signOut = useAuthStore((s) => s.signOut);
  const clearFavorites = useFavoritesStore((s) => s.clear);

  const favoriteCount = useFavoritesStore((s) => s.ids.size);
  const { past, upcoming } = useReservations();
  const { unreadCount } = useNotifications();

  const [signOutOpen, setSignOutOpen] = useState(false);

  const isGuest = kind === 'guest';

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.lg,
        }}
      >
        <Text variant="title">Profile</Text>

        {isGuest ? (
          <Card style={{ gap: theme.spacing.md }}>
            <Text variant="heading">You are browsing as a guest</Text>
            <Text variant="body" tone="muted">
              Create an account to book tables, save places and keep your reservation history.
            </Text>
            <View style={styles.guestActions}>
              <Button
                label="Create account"
                onPress={() => router.push('/(auth)/sign-up')}
                style={{ flex: 1 }}
              />
              <Button
                label="Sign in"
                variant="secondary"
                onPress={() => router.push('/(auth)/login')}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ) : (
          <Pressable
            onPress={() => router.push('/profile/edit')}
            accessibilityRole="button"
            accessibilityLabel={`Edit profile for ${user?.name}`}
            scaleTo={0.99}
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.base }}>
              {user?.avatarUrl ? (
                <SmartImage
                  uri={user.avatarUrl}
                  fallbackText={user.name}
                  accessibilityLabel=""
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.colors.canvasSunk }]}>
                  <Text variant="heading">{initialsOf(user?.name ?? 'Guest')}</Text>
                </View>
              )}

              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="heading" numberOfLines={1}>
                  {user?.name}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {user?.email}
                </Text>
                <Text variant="caption" tone="faint" numberOfLines={1}>
                  {user?.phone}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={theme.colors.inkFaint} />
            </Card>
          </Pressable>
        )}

        {/* Three numbers, because they are the three things people check. */}
        <View style={styles.stats}>
          <Stat label="Bookings" value={upcoming.length + past.length} />
          <Stat label="Saved" value={favoriteCount} />
          <Stat label="Visited" value={past.filter((r) => r.status === 'completed').length} />
        </View>

        {!isGuest && (user?.favoriteCuisines.length || user?.dietary.length) ? (
          <Card style={{ gap: theme.spacing.sm }}>
            <Text variant="overline" tone="faint">
              Your preferences
            </Text>
            {user.favoriteCuisines.length > 0 ? (
              <Text variant="body">
                {user.favoriteCuisines.map((c) => CUISINE_LABEL[c]).join(' · ')}
              </Text>
            ) : null}
            {user.dietary.length > 0 ? (
              <Text variant="caption" tone="muted">
                {user.dietary.map((d) => d.replace('-', ' ')).join(' · ')}
              </Text>
            ) : null}
          </Card>
        ) : null}

        <Group title="Your account">
          <ListRow
            icon="restaurant-outline"
            label="Reservation history"
            value={`${past.length}`}
            onPress={() => router.push('/(tabs)/reservations')}
          />
          <Divider inset={46} />
          <ListRow
            icon="heart-outline"
            label="Saved places"
            value={`${favoriteCount}`}
            onPress={() => router.push('/(tabs)/favorites')}
          />
          <Divider inset={46} />
          <ListRow
            icon="location-outline"
            label="Saved addresses"
            description="Home, work, anywhere you book from often"
            onPress={() => router.push('/profile/saved-places')}
          />
          <Divider inset={46} />
          <ListRow
            icon="options-outline"
            label="Cuisines and dietary needs"
            onPress={() => router.push('/profile/preferences')}
          />
        </Group>

        <Group title="App">
          <ListRow
            icon="notifications-outline"
            label="Notifications"
            value={unreadCount > 0 ? `${unreadCount} new` : undefined}
            onPress={() => router.push('/notifications')}
          />
          <Divider inset={46} />
          <ListRow
            icon="settings-outline"
            label="Settings"
            onPress={() => router.push('/profile/settings')}
          />
          <Divider inset={46} />
          <ListRow
            icon="help-circle-outline"
            label="Help and support"
            onPress={() => router.push('/profile/help')}
          />
          <Divider inset={46} />
          <ListRow
            icon="document-text-outline"
            label="Terms and privacy"
            onPress={() => router.push('/profile/legal')}
          />
        </Group>

        <Button
          label={isGuest ? 'Sign in' : 'Sign out'}
          variant={isGuest ? 'secondary' : 'danger'}
          fullWidth
          onPress={() => (isGuest ? router.push('/(auth)/login') : setSignOutOpen(true))}
        />

        <Text variant="caption" tone="faint" center>
          Mesa 1.0.0 · Demo build with mock data
        </Text>
      </ScrollView>

      <ConfirmDialog
        visible={signOutOpen}
        title="Sign out?"
        message="Your bookings stay on your account. Saved places on this device will be cleared."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        destructive
        onConfirm={async () => {
          setSignOutOpen(false);
          clearFavorites();
          await signOut();
          router.replace('/(auth)/welcome');
        }}
        onCancel={() => setSignOutOpen(false)}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.stat,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.hairline,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <Text variant="title" style={{ fontSize: 24 }}>
        {value}
      </Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="overline" tone="faint">
        {title}
      </Text>
      <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
        {children}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  guestActions: {
    flexDirection: 'row',
    gap: 10,
  },
});
