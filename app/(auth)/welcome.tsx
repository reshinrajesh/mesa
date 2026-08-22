import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { imagePool } from '@/mock/images';
import { Button, Pressable, SmartImage, Text } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { toAppError } from '@/utils/errors';
import { toast } from '@/store/uiStore';

/**
 * Welcome.
 *
 * One photograph, one sentence, three ways in. No carousel of value
 * propositions: nobody reads the second slide, and the fastest route to
 * understanding what this app is remains a picture of a table with food on it.
 *
 * "Browse without an account" is given real weight rather than being hidden as
 * a grey link, because it is genuinely the right first step for most people.
 */
export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const signInWithProvider = useAuthStore((s) => s.signInWithProvider);
  const [pendingProvider, setPendingProvider] = useState<'google' | 'apple' | null>(null);

  const handleProvider = async (provider: 'google' | 'apple') => {
    setPendingProvider(provider);
    try {
      await signInWithProvider(provider);
      router.replace('/(tabs)');
    } catch (error) {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    } finally {
      setPendingProvider(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <SmartImage
        uri={imagePool.trattoria[0]}
        fallbackText="Mesa"
        accessibilityLabel=""
        style={styles.hero}
      />

      <Animated.View
        entering={FadeInDown.duration(420).delay(80)}
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.canvas,
            paddingHorizontal: theme.screenGutter,
            paddingBottom: insets.bottom + theme.spacing.lg,
            gap: theme.spacing.md,
          },
        ]}
      >
        <Text variant="overline" tone="accent">
          Mesa
        </Text>

        <Text variant="display" style={{ fontSize: 38, lineHeight: 42 }}>
          The good tables,{'\n'}before they go.
        </Text>

        <Text variant="body" tone="muted" style={{ marginBottom: theme.spacing.sm }}>
          Find somewhere worth eating tonight and hold a table in about twenty seconds.
        </Text>

        {/*
          The mobile route leads. It is one field and no password, it is how
          people here expect to start, and it is the same button whether they
          have an account or not — the server knows which, and asking them to
          declare it first is a question only the app cares about.
        */}
        <Button
          label="Continue with mobile"
          fullWidth
          size="lg"
          icon="call-outline"
          onPress={() => router.push('/(auth)/mobile')}
        />

        <Button
          label="Create an account"
          variant="secondary"
          fullWidth
          size="lg"
          onPress={() => router.push('/(auth)/sign-up')}
        />

        <Button
          label="I already have one"
          variant="secondary"
          fullWidth
          size="lg"
          onPress={() => router.push('/(auth)/login')}
        />

        <View style={[styles.dividerRow, { marginVertical: theme.spacing.xs }]}>
          <View style={[styles.line, { backgroundColor: theme.colors.hairline }]} />
          <Text variant="caption" tone="faint">
            or
          </Text>
          <View style={[styles.line, { backgroundColor: theme.colors.hairline }]} />
        </View>

        <View style={styles.providers}>
          <ProviderButton
            icon="logo-google"
            label="Google"
            loading={pendingProvider === 'google'}
            onPress={() => handleProvider('google')}
          />
          <ProviderButton
            icon="logo-apple"
            label="Apple"
            loading={pendingProvider === 'apple'}
            onPress={() => handleProvider('apple')}
          />
        </View>

        <Pressable
          onPress={async () => {
            await continueAsGuest();
            router.replace('/(tabs)');
          }}
          accessibilityRole="button"
          accessibilityLabel="Browse without an account"
          accessibilityHint="You can create an account later when you book"
          style={styles.guest}
        >
          <Text variant="label" tone="muted">
            Browse without an account
          </Text>
          <Ionicons name="arrow-forward" size={15} color={theme.colors.inkMuted} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ProviderButton({
  icon,
  label,
  onPress,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={`Continue with ${label}`}
      style={[
        styles.provider,
        {
          borderColor: theme.colors.hairlineStrong,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.surface,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.colors.ink} />
      <Text variant="label">{loading ? 'Connecting…' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: '62%',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
  },
  providers: {
    flexDirection: 'row',
    gap: 10,
  },
  provider: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  guest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    marginTop: 4,
  },
});
