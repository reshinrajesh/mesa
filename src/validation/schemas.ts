import { z } from 'zod';

/**
 * Validation schemas.
 *
 * Messages are written for the person reading them: they say what to do, not
 * what rule failed. "Enter at least 8 characters" beats "password: min length
 * violation", and neither the field name nor the constraint leaks into the UI.
 */

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address')
  .email('That does not look like an email address');

const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'That is longer than we can store');

/** Permissive by design: an over-strict phone regex rejects real numbers. */
const phone = z
  .string()
  .trim()
  .min(6, 'Enter a phone number')
  .regex(/^[+]?[\d\s()-]{6,20}$/, 'Use digits, spaces and an optional +');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});
export type LoginValues = z.infer<typeof loginSchema>;

/** Signing in by mobile asks for the number and nothing else. */
export const mobileLoginSchema = z.object({ phone });
export type MobileLoginValues = z.infer<typeof mobileLoginSchema>;

/**
 * Optional, and validated only when there is something to validate.
 *
 * An empty string has to pass: the field is on the form, and somebody who
 * leaves it blank has answered it. `z.string().email().optional()` would reject
 * that, which is how an optional field ends up blocking a submit.
 */
const optionalEmail = z
  .string()
  .trim()
  .max(254, 'That address is longer than we can store')
  .refine((value) => value === '' || z.string().email().safeParse(value).success, {
    message: 'That does not look like an email address',
  })
  .optional();

/**
 * Which of the two somebody chose to register with.
 *
 * The form offers both and requires whichever is selected, so neither is the
 * one the app insists on. The other field stays on screen and stays optional:
 * somebody signing up by mobile often wants their confirmations by mail too,
 * and making them come back for it later is worse than a field they may skip.
 */
export type SignUpMethod = 'mobile' | 'email';

/** Permissive, and only applied to the field that was actually chosen. */
const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === '' || /^[+]?[\d\s()-]{6,20}$/.test(value), {
    message: 'Use digits, spaces and an optional +',
  })
  .optional();

export const signUpSchema = z
  .object({
    method: z.enum(['mobile', 'email']),
    name: z.string().trim().min(2, 'Enter your name').max(60, 'That name is a little long'),
    email: optionalEmail,
    phone: optionalPhone,
    password,
    confirmPassword: z.string(),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'Please accept the terms to continue' }),
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match',
  })
  // The chosen identifier is required; the other is not. Written as two
  // refinements rather than one so the error lands on the field the guest is
  // actually looking at.
  .refine((values) => values.method !== 'mobile' || (values.phone ?? '').trim().length >= 6, {
    path: ['phone'],
    message: 'Enter your mobile number',
  })
  .refine((values) => values.method !== 'email' || (values.email ?? '').trim().length > 0, {
    path: ['email'],
    message: 'Enter your email address',
  });
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const otpSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, 'The code is 6 digits')
    .regex(/^\d+$/, 'The code is digits only'),
});
export type OtpValues = z.infer<typeof otpSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(60, 'That name is a little long'),
  email,
  phone,
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const reservationNotesSchema = z.object({
  notes: z
    .string()
    .max(280, 'Keep it under 280 characters so the kitchen actually reads it')
    .optional()
    .default(''),
});

export const reviewSchema = z.object({
  rating: z.number().min(1, 'Pick a rating').max(5),
  body: z
    .string()
    .trim()
    .min(10, 'A sentence or two helps the next person')
    .max(1500, 'That is longer than we can store'),
});
export type ReviewValues = z.infer<typeof reviewSchema>;

/**
 * The final gate before `createReservation`. The wizard cannot reach Review
 * without these, but validating again here means a deep link or a restored
 * draft cannot skip the check.
 */
export const createReservationSchema = z.object({
  restaurantId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time'),
  partySize: z.number().int().min(1, 'At least one guest').max(20),
  seating: z.enum(['any', 'indoor', 'outdoor', 'bar', 'window', 'private']),
  occasion: z.enum(['none', 'birthday', 'anniversary', 'business', 'date-night', 'celebration']),
  notes: z.string().max(280),
});
