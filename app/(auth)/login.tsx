import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, View } from 'react-native';

import {
  loginSchema,
  mobileLoginSchema,
  type LoginValues,
  type MobileLoginValues,
} from '@/validation/schemas';
import {
  Button,
  Input,
  Pressable,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { authService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { toAppError } from '@/utils/errors';

/**
 * Sign in, two ways.
 *
 * Email and a password, or a mobile number and a code. Both are on the switch
 * rather than one being the screen and the other a link underneath it, because
 * a link underneath reads as the lesser option and the code is the way most
 * people here will actually get in.
 *
 * The mobile side has its own form. Sharing one would mean a password field
 * that is required half the time, which is the shape of validation nobody can
 * follow.
 */
export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const pending = useAuthStore((s) => s.pending);
  // The welcome screen's "Continue with mobile" lands here with the switch
  // already thrown, rather than on a second screen that asks the same
  // question with the same field.
  const params = useLocalSearchParams<{ method?: string }>();
  const [method, setMethod] = React.useState<'email' | 'mobile'>(
    params.method === 'mobile' ? 'mobile' : 'email',
  );

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

  const mobileForm = useForm<MobileLoginValues>({
    resolver: zodResolver(mobileLoginSchema),
    defaultValues: { phone: '' },
    mode: 'onBlur',
  });

  const onSendCode = async (values: MobileLoginValues) => {
    const destination = values.phone.trim();
    try {
      // Sent from here so a number the gateway refuses fails while the guest
      // is still looking at the field they typed it into.
      await authService.requestOtp(destination);
      router.push({ pathname: '/(auth)/otp', params: { destination } });
    } catch (error) {
      const app = toAppError(error);
      toast({ title: app.title, message: app.message, tone: 'danger' });
    }
  };

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

        <SegmentedControl
          options={[
            { value: 'email', label: 'Email' },
            { value: 'mobile', label: 'Mobile' },
          ]}
          value={method}
          onChange={setMethod}
        />

        {method === 'mobile' ? (
          <>
            <Controller
              control={mobileForm.control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Mobile number"
                  icon="call-outline"
                  placeholder="+91 98765 43210"
                  hint="We will send a six-digit code. No password needed."
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={mobileForm.formState.errors.phone?.message}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="go"
                  onSubmitEditing={mobileForm.handleSubmit(onSendCode)}
                />
              )}
            />

            <Button
              label="Send the code"
              size="lg"
              fullWidth
              loading={mobileForm.formState.isSubmitting}
              onPress={mobileForm.handleSubmit(onSendCode)}
              style={{ marginTop: theme.spacing.sm }}
            />
          </>
        ) : (
          <>
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

          </>
        )}

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
