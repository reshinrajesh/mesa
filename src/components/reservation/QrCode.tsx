import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { log } from '@/utils/log';
import { Text } from '@/components/ui/Text';

export interface QrCodeProps {
  value: string;
  size?: number;
}

/**
 * The booking QR.
 *
 * `react-native-qrcode-svg` is loaded lazily for the same reason the native map
 * is: if the native SVG dependency is missing in a given environment, this must
 * degrade rather than take down the confirmation screen — the screen that tells
 * someone their table is booked is the last one that should ever fail to render.
 *
 * The fallback prints the code in large type. A host can key that in; nobody
 * loses their table over a missing peer dependency.
 */
let cachedQr: React.ComponentType<{ value: string; size: number; color: string; backgroundColor: string }> | null | undefined;

function getQrComponent() {
  if (cachedQr !== undefined) return cachedQr;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('react-native-qrcode-svg');
    cachedQr = (module?.default ?? null) as typeof cachedQr;
  } catch (error) {
    log.debug('qr', 'qr renderer unavailable, falling back to the printed code', error);
    cachedQr = null;
  }
  return cachedQr;
}

export function QrCode({ value, size = 168 }: QrCodeProps) {
  const theme = useTheme();
  const Qr = getQrComponent();

  const code = value.split(':').pop() ?? value;

  if (!Qr) {
    return (
      <View
        accessible
        accessibilityLabel={`Booking code ${code.split('').join(' ')}`}
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            backgroundColor: theme.colors.canvasSunk,
            borderRadius: theme.radius.md,
          },
        ]}
      >
        <Text variant="overline" tone="faint">
          Show this code
        </Text>
        <Text variant="title" style={{ letterSpacing: 3 }}>
          {code}
        </Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={`QR code for booking ${code.split('').join(' ')}`}
      // Always on white, never on the paper canvas: scanners want maximum
      // contrast and some struggle with a warm ground.
      style={[styles.qrWrap, { backgroundColor: '#FFFFFF', borderRadius: theme.radius.sm }]}
    >
      <Qr value={value} size={size} color="#1A1613" backgroundColor="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrWrap: {
    padding: 10,
  },
});
