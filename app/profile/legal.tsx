import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Screen, ScreenHeader, SegmentedControl, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Terms and privacy.
 *
 * Written as short plain-language sections rather than a wall of clauses. This
 * is placeholder copy for a demo build and says so at the top — presenting
 * invented legal text as though it were binding would be worse than useless.
 */
export default function LegalScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms');

  return (
    <Screen>
      <ScreenHeader title="Terms and privacy" />

      <View style={{ paddingHorizontal: theme.screenGutter, paddingBottom: theme.spacing.base }}>
        <SegmentedControl
          options={[
            { value: 'terms', label: 'Terms' },
            { value: 'privacy', label: 'Privacy' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.lg,
        }}
      >
        <View
          style={{
            padding: theme.spacing.md,
            backgroundColor: theme.colors.warningSoft,
            borderRadius: theme.radius.md,
          }}
        >
          <Text variant="caption" tone="warning">
            Demo build. The text below is a plain-language placeholder, not a legal document, and it
            has not been reviewed by a lawyer.
          </Text>
        </View>

        {(tab === 'terms' ? TERMS : PRIVACY).map((section) => (
          <View key={section.title} style={{ gap: theme.spacing.sm }}>
            <Text variant="heading">{section.title}</Text>
            <Text variant="body" tone="muted" style={{ lineHeight: 23 }}>
              {section.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const TERMS = [
  {
    title: 'What Mesa does',
    body: 'Mesa passes a table request to a restaurant and tells you what they said. The agreement to serve you is between you and the restaurant; Mesa is the messenger.',
  },
  {
    title: 'Turning up',
    body: 'A booking holds a table for a limited window, usually fifteen minutes past the time. If you are running late, call the restaurant — most will hold longer if they know.',
  },
  {
    title: 'Cancelling',
    body: 'Cancel free of charge up to two hours before the sitting. Repeatedly booking and not turning up may lead to restaurants declining future requests.',
  },
  {
    title: 'What we do not do',
    body: 'Mesa takes no payment, holds no deposit and charges no fee. Prices shown on menus come from the restaurant and may be out of date.',
  },
];

const PRIVACY = [
  {
    title: 'What this build stores',
    body: 'Everything in this demo lives on your device. Bookings, favourites and preferences are written to local storage; sign-in tokens go to the system keychain. Nothing is sent to a server, because there is not one.',
  },
  {
    title: 'Location',
    body: 'Location is used only to sort restaurants by distance and to centre the map. It is read when you ask for it, never in the background, and never stored anywhere but this device.',
  },
  {
    title: 'What a restaurant sees',
    body: 'When a real backend is connected, a restaurant receives your name, phone number, party size and booking note. Nothing else about your account is shared with them.',
  },
  {
    title: 'Deleting your data',
    body: 'Signing out clears the session and this device’s saved places. Uninstalling removes everything else.',
  },
];
