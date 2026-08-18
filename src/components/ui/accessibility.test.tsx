import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, Text as RNText } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import { maxFontSizeMultiplier, type TextVariant } from '@/theme/typography';
import { toast, useUiStore } from '@/store/uiStore';
import { Input } from './Input';
import { useReduceMotion } from './Pressable';
import { Text } from './Text';
import { ToastHost } from './ToastHost';

/**
 * The three promises in DESIGN.md §9 that were still only promises.
 *
 * Each is checked where it can actually fail. The type ceilings are arithmetic
 * and belong in the domain checks — those compare every pair of variants at
 * full scale, and found a restaurant name rendering smaller than the sentence
 * beneath it. What arithmetic cannot see is whether the ceiling reaches the
 * rendered text at all, so that is here.
 */

/** The toast sits above the home indicator, so it needs real insets. */
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const VARIANTS: TextVariant[] = [
  'display',
  'title',
  'heading',
  'subheading',
  'body',
  'bodyStrong',
  'label',
  'caption',
  'overline',
  'numeric',
];

describe('dynamic type', () => {
  it.each(VARIANTS)('caps %s at its own ceiling rather than globally', async (variant) => {
    await render(<Text variant={variant}>Osteria Grano</Text>);

    // A table of ceilings that never reaches a `Text` is decoration. This is
    // the half of the promise no amount of arithmetic can check.
    const node = screen.getByText('Osteria Grano');
    expect(node.props.maxFontSizeMultiplier).toBe(maxFontSizeMultiplier[variant]);
  });
});

describe('live regions', () => {
  it('announces a validation error without the field being refocused', async () => {
    await render(<Input label="Email" value="" onChangeText={jest.fn()} error="Enter an email" />);

    const error = screen.getByText('Enter an email');
    // "polite" rather than "assertive": the message waits for the keystroke to
    // finish being announced instead of interrupting it.
    expect(error.props.accessibilityLiveRegion).toBe('polite');
  });

  it('announces a toast, which is the only notice of a background failure', async () => {
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ToastHost />
      </SafeAreaProvider>,
    );

    await act(async () => {
      toast({ title: 'Booking cancelled', tone: 'neutral' });
    });

    const banner = await screen.findByText('Booking cancelled');
    // Walks up to whichever ancestor carries the live region, because the
    // wrapper that owns it is a layout detail and the announcement is not.
    interface Ancestor {
      props?: Record<string, unknown>;
      parent?: Ancestor | null;
    }

    let node: Ancestor | null | undefined = banner as unknown as Ancestor;
    let announced = false;
    while (node) {
      if (node.props?.accessibilityLiveRegion === 'polite') announced = true;
      node = node.parent;
    }
    expect(announced).toBe(true);

    useUiStore.setState({ toasts: [] });
  });
});

describe('reduce motion', () => {
  const isEnabled = AccessibilityInfo.isReduceMotionEnabled as jest.Mock;

  function Probe() {
    const reduce = useReduceMotion();
    return <RNText>{reduce ? 'reduced' : 'full'}</RNText>;
  }

  afterEach(() => {
    isEnabled.mockReset();
  });

  it('follows the system setting rather than assuming it is off', async () => {
    isEnabled.mockResolvedValue(true);

    await render(<Probe />);

    await waitFor(() => expect(screen.getByText('reduced')).toBeOnTheScreen());
  });

  it('leaves motion alone when nobody asked for it to stop', async () => {
    isEnabled.mockResolvedValue(false);

    await render(<Probe />);

    expect(screen.getByText('full')).toBeOnTheScreen();
  });
});
