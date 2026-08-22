/**
 * One error vocabulary for the whole app.
 *
 * Services throw `AppError`. The UI reads `error.title` / `error.message` and
 * never inspects a raw response. Raw provider text (stack traces, SQL, "500
 * Internal Server Error", a Frappe traceback) is kept on `debugMessage`, which
 * is logged and never rendered — it tells the user nothing and occasionally
 * leaks schema details.
 */

export type ErrorCode =
  | 'network'
  | 'timeout'
  | 'server'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'no-availability'
  | 'slot-taken'
  | 'restaurant-unavailable'
  | 'reservation-locked'
  | 'waitlist-closed'
  | 'waitlist-duplicate'
  | 'waitlist-offer-expired'
  | 'bill-settled'
  | 'bill-void'
  | 'payment-failed'
  | 'auth-failed'
  | 'rate-limited'
  | 'unknown';

interface CopyEntry {
  title: string;
  message: string;
  /** Label for the primary action on the error state, when one makes sense. */
  action?: string;
  retryable: boolean;
}

const COPY: Record<ErrorCode, CopyEntry> = {
  network: {
    title: 'No connection',
    message: 'Mesa could not reach the internet. Check your connection and try again.',
    action: 'Try again',
    retryable: true,
  },
  timeout: {
    title: 'That took too long',
    message: 'The request timed out. It is usually a slow connection rather than a real fault.',
    action: 'Try again',
    retryable: true,
  },
  server: {
    title: 'Something went wrong on our side',
    message: 'This is not your fault. Give it a moment and try again.',
    action: 'Try again',
    retryable: true,
  },
  unauthorized: {
    title: 'Please sign in again',
    message: 'Your session expired. Signing in again will pick up right where you left off.',
    action: 'Sign in',
    retryable: false,
  },
  forbidden: {
    title: 'Not available on this account',
    message: 'This action is not permitted for your account.',
    retryable: false,
  },
  'not-found': {
    title: 'We could not find that',
    message: 'It may have been removed. Try searching for it again.',
    retryable: false,
  },
  validation: {
    title: 'Check the details',
    message: 'Some of the information entered is not quite right.',
    retryable: false,
  },
  'no-availability': {
    title: 'Nothing free at that time',
    message: 'This restaurant has no tables for that date and party size. Try another day or a smaller party.',
    action: 'Pick another date',
    retryable: false,
  },
  'slot-taken': {
    title: 'That time just went',
    message: 'Someone booked the last table at that time. The nearest free slots are still open.',
    action: 'See other times',
    retryable: false,
  },
  'restaurant-unavailable': {
    title: 'Not taking bookings',
    message: 'This restaurant is not accepting reservations right now. You can still call them directly.',
    retryable: false,
  },
  'reservation-locked': {
    title: 'Too close to the booking',
    message: 'Changes are not possible within two hours of the reservation. Please call the restaurant.',
    retryable: false,
  },
  'waitlist-closed': {
    title: 'No waitlist for that time',
    message: 'This restaurant is not keeping a list for that sitting. Another time on the same evening may be free.',
    action: 'See other times',
    retryable: false,
  },
  'waitlist-duplicate': {
    title: 'You are already on this list',
    message: 'One place per sitting. Your existing entry is in Bookings, and it keeps its place in the queue.',
    action: 'See my bookings',
    retryable: false,
  },
  'waitlist-offer-expired': {
    title: 'That table has gone',
    message: 'The hold ran out and the table went to the next party. You are still on the list for this sitting.',
    retryable: false,
  },
  'bill-settled': {
    title: 'This bill is settled',
    message: 'It was paid already. The receipt is on your booking.',
    action: 'See the receipt',
    retryable: false,
  },
  'bill-void': {
    title: 'The venue cancelled this bill',
    message: 'Nothing is owed on it. Ask the floor if you were expecting one.',
    retryable: false,
  },
  'payment-failed': {
    // The only refusal in the app where the guest's own money is in question,
    // so it says what did *not* happen before it says what to do.
    title: 'That payment did not go through',
    message: 'Nothing was charged. You can try again, or ask the floor to take it at the till.',
    action: 'Try again',
    retryable: true,
  },
  'auth-failed': {
    title: 'Sign-in failed',
    message: 'That email and password combination did not match an account.',
    retryable: false,
  },
  'rate-limited': {
    title: 'Slow down a moment',
    message: 'Too many attempts. Wait a minute before trying again.',
    retryable: true,
  },
  unknown: {
    title: 'Something went wrong',
    message: 'An unexpected problem occurred. Try again in a moment.',
    action: 'Try again',
    retryable: true,
  },
};

/**
 * Whether a string off the wire names a code this app has copy for.
 *
 * Read from `COPY` rather than written out again, so a code added to the union
 * is accepted here the day its copy exists and never before: an `ErrorCode`
 * with no entry would render an undefined title.
 *
 * This is a whitelist on purpose. A server naming its own code decides which
 * of seventeen sentences the user reads, so an unrecognised one falls back to
 * the status mapping rather than being trusted.
 */
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(COPY, value);
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly title: string;
  readonly retryable: boolean;
  readonly action?: string;
  /** Provider detail, for logs only. Never rendered. */
  readonly debugMessage?: string;
  /** Field-level messages when `code === 'validation'`. */
  readonly fields?: Record<string, string>;

  constructor(
    code: ErrorCode,
    options: { debugMessage?: string; fields?: Record<string, string>; message?: string } = {},
  ) {
    const copy = COPY[code];
    super(options.message ?? copy.message);
    this.name = 'AppError';
    this.code = code;
    this.title = copy.title;
    this.retryable = copy.retryable;
    this.action = copy.action;
    this.debugMessage = options.debugMessage;
    this.fields = options.fields;
  }
}

/**
 * The single funnel every `catch` block uses. Anything unrecognised becomes an
 * `unknown` AppError with the original text preserved for the log, so the UI
 * always has friendly copy to render no matter what was thrown.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Error) {
    if (error.name === 'AbortError') return new AppError('timeout', { debugMessage: error.message });
    if (/network request failed|fetch failed/i.test(error.message)) {
      return new AppError('network', { debugMessage: error.message });
    }
    return new AppError('unknown', { debugMessage: `${error.name}: ${error.message}` });
  }

  return new AppError('unknown', { debugMessage: String(error) });
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** What a toast or an inline banner shows. Always safe to render. */
export function userMessage(error: unknown): { title: string; message: string } {
  const appError = toAppError(error);
  return { title: appError.title, message: appError.message };
}
