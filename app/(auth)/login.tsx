import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';

import { loginSchema, type LoginValues } from '@/validation/schemas';
import { Button, Input, Pressable, Screen, ScreenHeader, Text } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { toAppError } from '@/utils/errors';

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const pending = useAuthStore((s) => s.pending);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    // Validate on blur, not on every keystroke: an error appearing under a
    // half-typed email is noise, and it makes the form feel like it is nagging.
    mode: 'onBlur',
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      await signIn(values.email, values.password);
      router.replace('/(tabs)');
    } catch (error) {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    }
  };

  return (
    <Screen keyboardSafe>
      <ScreenHeader />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.xxl,
          gap: theme.spacing.base,
        }}
      >
        <View style={{ gap: theme.spacing.xs, marginBottom: theme.spacing.md }}>
          <Text variant="title">Welcome back</Text>
          <Text variant="body" tone="muted">
            Sign in to see your bookings and saved places.
          </Text>
        </View>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              icon="mail-outline"
              placeholder="you@example.com"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Password"
              icon="lock-closed-outline"
              placeholder="Your password"
              secure
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />

        <Pressable
          onPress={() => router.push('/(auth)/forgot-password')}
          accessibilityRole="button"
          style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}
        >
          <Text variant="label" tone="accent">
            Forgot your password?
          </Text>
        </Pressable>

        <Button
          label="Sign in"
          size="lg"
          fullWidth
          loading={pending}
          onPress={handleSubmit(onSubmit)}
          style={{ marginTop: theme.spacing.sm }}
        />

        <Pressable
          onPress={() => router.push('/(auth)/otp')}
          accessibilityRole="button"
          style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}
        >
          <Text variant="label" tone="muted">
            Send me a code instead
          </Text>
        </Pressable>

        {/* The demo credentials, printed rather than hidden — this build has
            no backend, and a login screen you cannot get past is a dead end. */}
        <View
          style={{
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.canvasSunk,
            gap: 4,
          }}
        >
          <Text variant="overline" tone="faint">
            Demo build
          </Text>
          <Text variant="caption" tone="muted">
            alex.marques@example.com · mesa1234 — or any email with an 8-character password.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
