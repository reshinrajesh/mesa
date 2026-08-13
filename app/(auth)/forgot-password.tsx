import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';

import { forgotPasswordSchema, type ForgotPasswordValues } from '@/validation/schemas';
import { Button, Input, Screen, ScreenHeader, Text } from '@/components/ui';
import { authService } from '@/services';
import { toast } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { toAppError } from '@/utils/errors';

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setPending(true);
    try {
      const result = await authService.requestPasswordReset(values.email);
      setSentTo(result.sentTo);
    } catch (error) {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Screen keyboardSafe>
      <ScreenHeader />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.screenGutter,
          gap: theme.spacing.base,
        }}
      >
        {sentTo ? (
          <View style={{ gap: theme.spacing.md, paddingTop: theme.spacing.lg }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: theme.colors.positiveSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="mail-open-outline" size={26} color={theme.colors.positive} />
            </View>

            <Text variant="title">Check your inbox</Text>
            <Text variant="body" tone="muted">
              If an account exists for {sentTo}, a reset link is on its way. It expires in an hour.
            </Text>

            {/* Deliberately says "if an account exists": confirming which
                addresses are registered turns this screen into a way to
                enumerate users. */}

            <Button
              label="Back to sign in"
              size="lg"
              fullWidth
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>
        ) : (
          <>
            <View style={{ gap: theme.spacing.xs, marginBottom: theme.spacing.sm }}>
              <Text variant="title">Reset your password</Text>
              <Text variant="body" tone="muted">
                Enter the email on your account and we will send a link to set a new password.
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
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />

            <Button
              label="Send reset link"
              size="lg"
              fullWidth
              loading={pending}
              onPress={handleSubmit(onSubmit)}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
