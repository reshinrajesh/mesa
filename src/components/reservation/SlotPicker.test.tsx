import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { TimeSlot } from '@/types';

import { SlotPicker } from './SlotPicker';

/**
 * The four slot states.
 *
 * These assert on the accessibility label rather than on colours or borders,
 * for two reasons. It is the thing a screen reader user actually receives, so a
 * regression here is a real defect rather than a cosmetic one. And it is stable
 * across restyling, so the test does not fail every time a border changes.
 */

const slot = (over: Partial<TimeSlot> & { time: string }): TimeSlot => ({
  availability: 'available',
  tablesLeft: 6,
  ...over,
});

const BOARD: TimeSlot[] = [
  slot({ time: '19:00' }),
  slot({ time: '19:30', availability: 'limited', tablesLeft: 2 }),
  slot({ time: '20:00', availability: 'unavailable', tablesLeft: 0 }),
  slot({
    time: '20:30',
    availability: 'unavailable',
    tablesLeft: 0,
    waitlist: { queueLength: 3 },
  }),
];

describe('SlotPicker', () => {
  it('announces each of the four states distinctly', async () => {
    await render(<SlotPicker slots={BOARD} value={null} onChange={jest.fn()} />);

    expect(screen.getByLabelText(/7:00 PM, available/)).toBeOnTheScreen();
    expect(screen.getByLabelText('7:30 PM, 2 tables left')).toBeOnTheScreen();
    expect(screen.getByLabelText('8:00 PM, fully booked')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('8:30 PM, fully booked, join the waitlist, 3 ahead of you'),
    ).toBeOnTheScreen();
  });

  it('lets a full slot be tapped when it has a queue, and not when it has none', async () => {
    const onChange = jest.fn();
    await render(<SlotPicker slots={BOARD} value={null} onChange={onChange} />);

    // The distinction the whole feature rests on: one full slot is a dead pill,
    // the other is the way into the waitlist.
    await fireEvent.press(screen.getByLabelText('8:00 PM, fully booked'));
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.press(
      screen.getByLabelText('8:30 PM, fully booked, join the waitlist, 3 ahead of you'),
    );
    expect(onChange).toHaveBeenCalledWith('20:30', true);
  });

  it('reports a bookable slot as a booking, not as a queue', async () => {
    const onChange = jest.fn();
    await render(<SlotPicker slots={BOARD} value={null} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText(/7:00 PM, available/));
    expect(onChange).toHaveBeenCalledWith('19:00', false);
  });

  it('marks the selected slot as selected, and only that one', async () => {
    await render(<SlotPicker slots={BOARD} value="19:30" onChange={jest.fn()} />);

    const selected = screen.getAllByRole('button').filter((node) => node.props.accessibilityState?.selected);
    expect(selected).toHaveLength(1);
    expect(selected[0].props.accessibilityLabel).toBe('7:30 PM, 2 tables left');
  });
});
