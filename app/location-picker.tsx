import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { mockRestaurants } from '@/mock/restaurants';
import { Button, Divider, Pressable, Screen, ScreenHeader, Text } from '@/components/ui';
import { fallbackLocation } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { toast, useUiStore } from '@/store/uiStore';
import { useTheme } from '@/theme';

/**
 * Location picker.
 *
 * Three sources, in the order people want them: the device, their saved
 * addresses, and the city's neighbourhoods. The device option states plainly
 * that it needs permission rather than triggering a system prompt out of
 * nowhere — an unexplained permission dialog is the fastest way to get a "no".
 */
export default function LocationPickerScreen() {
  const theme = useTheme();
  const router = useRouter();

  const location = useUiStore((s) => s.location);
  const setLocation = useUiStore((s) => s.setLocation);
  const resolveDeviceLocation = useUiStore((s) => s.useDeviceLocation);
  const user = useAuthStore((s) => s.user);

  const [locating, setLocating] = useState(false);

  const neighbourhoods = useMemo(() => {
    const seen = new Map<string, { latitude: number; longitude: number }>();
    for (const restaurant of mockRestaurants) {
      if (!seen.has(restaurant.neighbourhood)) {
        seen.set(restaurant.neighbourhood, restaurant.coordinates);
      }
    }
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const requestDevice = async () => {
    setLocating(true);
    const granted = await resolveDeviceLocation();
    setLocating(false);
    if (granted) {
      router.back();
    } else {
      toast({
        title: 'Location is off',
        message: `No problem — Mesa will use ${fallbackLocation.label} instead. You can pick a neighbourhood below.`,
        tone: 'neutral',
      });
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Where are you looking?" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.lg,
        }}
      >
        <Button
          label={locating ? 'Finding you…' : 'Use my current location'}
          icon="navigate-outline"
          fullWidth
          size="lg"
          loading={locating}
          onPress={requestDevice}
        />

        <Text variant="caption" tone="faint">
          Mesa asks for location only to sort restaurants by distance. Nothing is stored on a
          server, and declining leaves every other feature working.
        </Text>

        {user?.savedPlaces.length ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="overline" tone="faint">
              Your places
            </Text>
            {user.savedPlaces.map((place) => (
              <Option
                key={place.id}
                icon={place.label === 'Home' ? 'home-outline' : 'briefcase-outline'}
                title={place.label}
                subtitle={place.address}
                selected={location.label === place.label}
                onPress={() => {
                  setLocation({
                    latitude: place.latitude,
                    longitude: place.longitude,
                    label: place.label,
                    source: 'saved-place',
                  });
                  router.back();
                }}
              />
            ))}
          </View>
        ) : null}

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" tone="faint">
            Lisbon neighbourhoods
          </Text>

          {neighbourhoods.map(([name, coordinates], index) => (
            <React.Fragment key={name}>
              <Option
                icon="location-outline"
                title={name}
                selected={location.label === name}
                onPress={() => {
                  setLocation({ ...coordinates, label: name, source: 'saved-place' });
                  router.back();
                }}
              />
              {index < neighbourhoods.length - 1 ? <Divider inset={46} /> : null}
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Option({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      scaleTo={0.99}
      dim
      style={[styles.option, { paddingVertical: theme.spacing.md }]}
    >
      <View
        style={[
          styles.glyph,
          { backgroundColor: theme.colors.canvasSunk, borderRadius: theme.radius.sm },
        ]}
      >
        <Ionicons name={icon} size={17} color={theme.colors.ink} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {selected ? (
        <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  glyph: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
