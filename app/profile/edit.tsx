import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

import { profileSchema, type ProfileValues } from '@/validation/schemas';
import { Button, Input, Screen, ScreenHeader, SmartImage, Text } from '@/components/ui';
import { authService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { toAppError } from '@/utils/errors';
import { initialsOf } from '@/utils/format';

export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [pending, setPending] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (values: ProfileValues) => {
    setPending(true);
    try {
      const updated = await authService.updateProfile(values);
      setUser(updated);
      toast({ title: 'Profile updated', tone: 'positive' });
      router.back();
    } catch (error) {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen keyboardSafe>
      <ScreenHeader title="Your details" />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          paddingBottom: theme.spacing.xxxl,
          gap: theme.spacing.base,
        }}
      >
        <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}>
          {user?.avatarUrl ? (
            <SmartImage
              uri={user.avatarUrl}
              fallbackText={user.name}
              accessibilityLabel="Your profile photo"
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.fallback, { backgroundColor: theme.colors.canvasSunk }]}>
              <Text variant="title">{initialsOf(user?.name ?? 'You')}</Text>
            </View>
          )}
          {/* Photo upload needs a real backend to store the file, so the
              affordance is deliberately absent rather than present and dead. */}
          <Text variant="caption" tone="faint">
            Photo comes from your linked account
          </Text>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full name"
              icon="person-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
              autoComplete="name"
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              icon="mail-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Phone"
              icon="call-outline"
              hint="Restaurants use this if they need to reach you on the night."
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phone?.message}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          )}
        />

        <Button
          label="Save"
          size="lg"
          fullWidth
          disabled={!isDirty}
          loading={pending}
          onPress={handleSubmit(onSubmit)}
          style={{ marginTop: theme.spacing.sm }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
