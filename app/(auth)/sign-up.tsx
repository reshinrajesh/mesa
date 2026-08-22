import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';

import { signUpSchema, type SignUpValues } from '@/validation/schemas';
import { Button, Input, Pressable, Screen, ScreenHeader, Text } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { toAppError } from '@/utils/errors';

export default function SignUpScreen() {
  const theme = useTheme();
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const pending = useAuthStore((s) => s.pending);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false as true,
    },
    mode: 'onBlur',
  });

  const onSubmit = async (values: SignUpValues) => {
    try {
      await signUp({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });
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
          gap: theme.spacing.sm,
        }}
      >
        <View style={{ gap: theme.spacing.xs, marginBottom: theme.spacing.md }}>
          <Text variant="title">Create your account</Text>
          <Text variant="body" tone="muted">
            Restaurants need a name and a number to hold a table. That is all we ask for.
          </Text>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full name"
              icon="person-outline"
              placeholder="Alexandra Marques"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
              autoComplete="name"
              textContentType="name"
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
              placeholder="you@example.com"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
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
              placeholder="+91 98765 43210"
              hint="Restaurants use this if they need to reach you on the night."
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phone?.message}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
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
              placeholder="At least 8 characters"
              secure
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirm password"
              icon="lock-closed-outline"
              placeholder="Type it once more"
              secure
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword?.message}
              autoCapitalize="none"
              autoComplete="new-password"
            />
          )}
        />

        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field: { onChange, value } }) => (
            <View style={{ gap: 4 }}>
              <Pressable
                onPress={() => onChange(!value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(value) }}
                accessibilityLabel="Accept the terms and privacy policy"
                style={[styles.checkRow, { paddingVertical: theme.spacing.sm }]}
                scaleTo={0.99}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderRadius: theme.radius.xs,
                      backgroundColor: value ? theme.colors.ink : 'transparent',
                      borderColor: value ? theme.colors.ink : theme.colors.hairlineStrong,
                    },
                  ]}
                >
                  {value ? (
                    <Ionicons name="checkmark" size={14} color={theme.colors.inkOn} />
                  ) : null}
                </View>
                <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                  I agree to the Terms of Service and the Privacy Policy.
                </Text>
              </Pressable>
              {errors.acceptedTerms ? (
                <Text variant="caption" tone="danger">
                  {errors.acceptedTerms.message}
                </Text>
              ) : null}
            </View>
          )}
        />

        <Button
          label="Create account"
          size="lg"
          fullWidth
          loading={pending}
          onPress={handleSubmit(onSubmit)}
          style={{ marginTop: theme.spacing.sm }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
