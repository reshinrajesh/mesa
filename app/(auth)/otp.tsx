import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Pressable, Screen, ScreenHeader, Text } from '@/components/ui';
import { DEMO_OTP, authService } from '@/services';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/uiStore';
import { useTheme } from '@/theme';
import { toAppError } from '@/utils/errors';
import { haptics } from '@/utils/haptics';

const LENGTH = 6;
const RESEND_SECONDS = 30;

/**
 * OTP entry.
 *
 * One hidden `TextInput` behind six drawn boxes, rather than six real inputs.
 * Six inputs break paste, break autofill of the SMS code, and produce a focus
 * dance that fights the user on backspace. The single field gets `oneTimeCode`
 * autofill for free on iOS and `sms-otp` on Android.
 */
export default function OtpScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ destination?: string }>();
  const destination = params.destination ?? 'alex.marques@example.com';

  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const pending = useAuthStore((s) => s.pending);

  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [maskedTo, setMaskedTo] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  useEffect(() => {
    authService
      .requestOtp(destination)
      .then((result) => setMaskedTo(result.sentTo))
      .catch(() => setMaskedTo(destination));
  }, [destination]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const submit = async (value: string) => {
    setError(null);
    try {
      await verifyOtp(destination, value);
      haptics.success();
      router.replace('/(tabs)');
    } catch (caught) {
      const app = toAppError(caught);
      haptics.error();
      setError(app.fields?.code ?? app.message);
      setCode('');
    }
  };

  const onChange = (next: string) => {
    const digits = next.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    setError(null);
    // Auto-submit on the sixth digit; making someone press a button after
    // typing the last digit of a code they were just shown is busywork.
    if (digits.length === LENGTH) void submit(digits);
  };

  return (
    <Screen keyboardSafe>
      <ScreenHeader />

      <View style={{ paddingHorizontal: theme.screenGutter, gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Text variant="title">Enter your code</Text>
          <Text variant="body" tone="muted">
            We sent a 6-digit code to {maskedTo ?? '…'}.
          </Text>
        </View>

        <Pressable
          onPress={() => inputRef.current?.focus()}
          accessibilityRole="button"
          accessibilityLabel={`Verification code, ${code.length} of ${LENGTH} digits entered`}
          scaleTo={1}
          style={styles.boxes}
        >
          {Array.from({ length: LENGTH }, (_, index) => {
            const filled = index < code.length;
            const active = index === code.length;
            return (
              <View
                key={index}
                style={[
                  styles.box,
                  {
                    borderRadius: theme.radius.sm,
                    backgroundColor: theme.colors.surface,
                    borderColor: error
                      ? theme.colors.danger
                      : active
                        ? theme.colors.ink
                        : theme.colors.hairline,
                    borderWidth: active ? 2 : StyleSheet.hairlineWidth * 2,
                  },
                ]}
              >
                <Text variant="title" style={{ fontSize: 24 }}>
                  {filled ? code[index] : ''}
                </Text>
              </View>
            );
          })}
        </Pressable>

        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={LENGTH}
          autoFocus
          // Off-screen rather than opacity 0: a zero-opacity field still steals
          // taps meant for the boxes on Android.
          style={styles.hiddenInput}
        />

        <View style={{ minHeight: 20 }}>
          {error ? (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </View>

        <Button
          label="Verify"
          size="lg"
          fullWidth
          loading={pending}
          disabled={code.length !== LENGTH}
          onPress={() => void submit(code)}
        />

        <Pressable
          onPress={() => {
            if (secondsLeft > 0) return;
            setSecondsLeft(RESEND_SECONDS);
            void authService.requestOtp(destination);
            toast({ title: 'Code sent again', tone: 'neutral' });
          }}
          disabled={secondsLeft > 0}
          accessibilityRole="button"
          style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}
        >
          <Text variant="label" tone={secondsLeft > 0 ? 'faint' : 'accent'}>
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Send a new code'}
          </Text>
        </Pressable>

        <View
          style={{
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
            The code is {DEMO_OTP}.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  boxes: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  box: {
    flex: 1,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    left: -9999,
    width: 1,
    height: 1,
  },
});
