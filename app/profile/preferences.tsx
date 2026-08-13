import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { Cuisine, DietaryPreference } from '@/types';

import { CUISINES } from '@/constants/cuisines';
import { Button, Chip, Screen, ScreenHeader, Text } from '@/components/ui';
import { authService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { toAppError } from '@/utils/errors';

const DIETARY: { value: DietaryPreference; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'gluten-free', label: 'Gluten free' },
  { value: 'dairy-free', label: 'Dairy free' },
  { value: 'nut-allergy', label: 'Nut allergy' },
];

/**
 * Preferences.
 *
 * These feed the recommendation engine, and the screen says so. A preferences
 * form that does not explain what it changes gets filled in by nobody.
 */
export default function PreferencesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [cuisines, setCuisines] = useState<Cuisine[]>(user?.favoriteCuisines ?? []);
  const [dietary, setDietary] = useState<DietaryPreference[]>(user?.dietary ?? []);
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    try {
      const updated = await authService.updateProfile({
        favoriteCuisines: cuisines,
        dietary,
      });
      setUser(updated);
      toast({ title: 'Preferences saved', tone: 'positive' });
      router.back();
    } catch (error) {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    } finally {
      setPending(false);
    }
  };

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <Screen>
      <ScreenHeader title="Your preferences" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.xl,
        }}
      >
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: 3 }}>
            <Text variant="heading">Cuisines you like</Text>
            <Text variant="caption" tone="muted">
              Used to pick what shows up in “Chosen for you” on the home screen.
            </Text>
          </View>

          <View style={styles.wrap}>
            {CUISINES.map((cuisine) => (
              <Chip
                key={cuisine.value}
                label={cuisine.label}
                size="sm"
                selected={cuisines.includes(cuisine.value)}
                onPress={() => toggle(cuisines, cuisine.value, setCuisines)}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: 3 }}>
            <Text variant="heading">Dietary needs</Text>
            <Text variant="caption" tone="muted">
              Shown on the menu screen, and suggested as a booking note so the kitchen knows before
              you sit down.
            </Text>
          </View>

          <View style={styles.wrap}>
            {DIETARY.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                size="sm"
                selected={dietary.includes(option.value)}
                onPress={() => toggle(dietary, option.value, setDietary)}
              />
            ))}
          </View>
        </View>

        <Button label="Save preferences" size="lg" fullWidth loading={pending} onPress={save} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
