import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';

import { Button, Input, Screen, ScreenHeader, Text } from '@/components/ui';
import { authService } from '@/services';
import { mobileSignInSchema, type MobileSignInValues } from '@/validation/schemas';
import { useTheme } from '@/theme';
import { toast } from '@/store/uiStore';
import { toAppError } from '@/utils/errors';

/**
 * Sign in, or sign up, with a mobile number.
 *
 * One screen and one field, because the two are the same act here: a number
 * with an account gets a code and is signed in, a number without one gets a
 * code and is signed up. Asking somebody to declare which they are before they
 * have typed anything is a question only the app cares about — and the answer
 * is on the server, which knows whether the number is already known.
 *
 * That is why this screen does not say "new here?" anywhere. It sends the
 * code, and `verifyOtp` does whichever of the two turns out to be true.
 */
export default function MobileScreen() {
  const router = useRouter();
  const theme = useTheme();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MobileSignInValues>({
    resolver: zodResolver(mobileSignInSchema),
    defaultValues: { phone: '' },
    mode: 'onBlur',
  });

  const onSubmit = async (values: MobileSignInValues) => {
    const destination = values.phone.trim();
    try {
      // Requested here rather than on the next screen so a number the gateway
      // refuses fails while the guest is still looking at the field they typed
      // it into, rather than on a code screen with nothing to correct.
      await authService.requestOtp(destination);
      router.push({ pathname: '/(auth)/otp', params: { destination } });
    } catch (error) {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    }
  };

  return (
    <Screen keyboardSafe>
      <ScreenHeader title="Continue with mobile" onBack={router.back} />

      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Text variant="body" tone="muted">
          We will send a six-digit code. If the number is new, this creates your account.
        </Text>

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Mobile number"
              icon="call-outline"
              placeholder="+91 98765 43210"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phone?.message}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              autoFocus
            />
          )}
        />

        <Button
          label="Send the code"
          fullWidth
          size="lg"
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />

        <Text variant="caption" tone="faint">
          Standard message rates apply. You can also sign up with an email and a password.
        </Text>
      </View>
    </Screen>
  );
}
