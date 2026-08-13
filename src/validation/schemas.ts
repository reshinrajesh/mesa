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

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name').max(60, 'That name is a little long'),
    email,
    phone,
    password,
    confirmPassword: z.string(),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'Please accept the terms to continue' }),
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match',
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
