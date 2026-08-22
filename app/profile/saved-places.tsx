import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, Divider, EmptyState, Pressable, Screen, ScreenHeader, Text } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { toast, useUiStore } from '@/store/uiStore';
import { useTheme } from '@/theme';

/**
 * Saved addresses.
 *
 * Read-only for now: adding one properly needs a geocoding search, which needs
 * a keyed API and therefore a server. Shipping a broken "Add" button would be
 * worse than not having one, so the screen says what it is instead.
 */
export default function SavedPlacesScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const setLocation = useUiStore((s) => s.setLocation);
  const activeLabel = useUiStore((s) => s.location.label);

  const places = user?.savedPlaces ?? [];

  return (
    <Screen>
      <ScreenHeader title="Saved addresses" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.base,
        }}
      >
        {places.length === 0 ? (
          <EmptyState
            icon="location-outline"
            title="No saved addresses"
            message="Saved addresses let you search from home or work without turning on location."
          />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: theme.spacing.base }}>
            {places.map((place, index) => (
              <React.Fragment key={place.id}>
                <Pressable
                  onPress={() => {
                    setLocation({
                      latitude: place.latitude,
                      longitude: place.longitude,
                      label: place.label,
                      source: 'saved-place',
                    });
                    toast({ title: `Searching around ${place.label}`, tone: 'neutral' });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Search around ${place.label}, ${place.address}`}
                  accessibilityState={{ selected: activeLabel === place.label }}
                  scaleTo={0.99}
                  dim
                  style={[styles.row, { paddingVertical: theme.spacing.md }]}
                >
                  <View
                    style={[
                      styles.glyph,
                      { backgroundColor: theme.colors.canvasSunk, borderRadius: theme.radius.sm },
                    ]}
                  >
                    <Ionicons
                      name={place.label === 'Home' ? 'home-outline' : 'briefcase-outline'}
                      size={17}
                      color={theme.colors.ink}
                    />
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="body">{place.label}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {place.address}
                    </Text>
                  </View>

                  {activeLabel === place.label ? (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                  ) : null}
                </Pressable>

                {index < places.length - 1 ? <Divider inset={46} /> : null}
              </React.Fragment>
            ))}
          </Card>
        )}

        <Text variant="caption" tone="faint">
          Adding a new address needs address search, which arrives with the live backend. For now
          you can pick any Bengaluru neighbourhood from the location selector on the home screen.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
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
