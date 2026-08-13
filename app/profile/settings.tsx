import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import type { ThemePreference } from '@/theme';

import { Card, Divider, ListRow, Screen, ScreenHeader, SegmentedControl, Text } from '@/components/ui';
import { useNotificationPreferences } from '@/hooks/useNotifications';
import { notificationService } from '@/services';
import { toast, useUiStore } from '@/store/uiStore';
import { useTheme, useThemePreference } from '@/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { preference, setPreference } = useThemePreference();
  const { preferences, update } = useNotificationPreferences();
  const clearRecentlyViewed = useUiStore((s) => s.clearRecentlyViewed);

  return (
    <Screen>
      <ScreenHeader title="Settings" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.lg,
        }}
      >
        <Group title="Appearance">
          <View style={{ paddingVertical: theme.spacing.md, gap: theme.spacing.sm }}>
            <SegmentedControl<ThemePreference>
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              value={preference}
              onChange={setPreference}
            />
            <Text variant="caption" tone="faint">
              System follows the setting on your phone, including its schedule.
            </Text>
          </View>
        </Group>

        <Group title="Notifications">
          <ListRow
            label="Booking updates"
            description="Confirmations, changes and cancellations"
            toggle={{
              value: preferences?.reservationUpdates ?? true,
              onChange: (value) =>
                preferences && update({ ...preferences, reservationUpdates: value }),
            }}
          />
          <Divider />
          <ListRow
            label="Reminders"
            description="A nudge a few hours before your table"
            toggle={{
              value: preferences?.reminders ?? true,
              onChange: async (value) => {
                if (!preferences) return;
                if (value) {
                  const granted = await notificationService.requestPermission();
                  if (!granted) {
                    toast({
                      title: 'Notifications are off',
                      message: 'Turn them on for Mesa in your phone settings to get reminders.',
                      tone: 'neutral',
                    });
                    return;
                  }
                }
                update({ ...preferences, reminders: value });
              },
            }}
          />
          <Divider />
          <ListRow
            label="Offers from restaurants"
            description="Occasional, and off by default"
            toggle={{
              value: preferences?.offers ?? false,
              onChange: (value) => preferences && update({ ...preferences, offers: value }),
            }}
          />
        </Group>

        <Group title="Data">
          <ListRow
            label="Clear recently viewed"
            description="Removes the browsing history on this device"
            onPress={() => {
              clearRecentlyViewed();
              toast({ title: 'Recently viewed cleared', tone: 'neutral' });
            }}
            showChevron={false}
          />
          <Divider />
          <ListRow
            label="Terms and privacy"
            onPress={() => router.push('/profile/legal')}
          />
        </Group>

        <Text variant="caption" tone="faint" center>
          Mesa 1.0.0 · Demo build with mock data. Nothing you enter leaves this device.
        </Text>
      </ScrollView>
    </Screen>
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
