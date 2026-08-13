import { useEffect, useRef, useState } from 'react';

/** Debounced mirror of a value. Used to keep search off the keystroke path. */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/** Stable callback that runs at most once per window. For scroll handlers. */
export function useThrottledCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  intervalMs: number,
) {
  const lastRun = useRef(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useRef((...args: Args) => {
    const now = Date.now();
    if (now - lastRun.current < intervalMs) return;
    lastRun.current = now;
    callbackRef.current(...args);
  }).current;
}
