'use server';

import { signUpSchema, loginSchema } from '@/lib/schemas';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';
import { Profile } from '@/lib/models/Profile';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setAuthCookie,
  clearAuthCookie,
} from '@/lib/auth';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
} from '@/lib/rate-limit';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export type AuthResult = {
  error?: string;
  success?: string;
};

async function getClientIp(): Promise<string> {
  const reqHeaders = await headers();
  const forwarded = reqHeaders.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return reqHeaders.get('x-real-ip') || '127.0.0.1';
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const ip = await getClientIp();

  // Rate limiting by IP
  const rateLimit = await checkRateLimit(`ip:${ip}`);
  if (!rateLimit.allowed) {
    return { error: rateLimit.message };
  }

  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    display_name: formData.get('display_name'),
  };

  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await connectDB();

  const normalizedEmail = parsed.data.email.toLowerCase().trim();

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    await recordFailedAttempt(`ip:${ip}`);
    // Generic message to avoid email enumeration
    return { error: 'An account with this email already exists or is invalid.' };
  }

  // Hash password with bcrypt cost 12
  const passwordHash = await hashPassword(parsed.data.password);

  // Users ALWAYS get role 'user'. A user can NEVER set their own role.
  const newUser = await User.create({
    email: normalizedEmail,
    passwordHash,
    displayName: parsed.data.display_name.trim(),
    role: 'user',
  });

  // Create initial profile
  await Profile.create({
    userId: newUser._id,
    unitSystem: 'metric',
  });

  // Clear IP rate limit on success
  await clearRateLimit(`ip:${ip}`);

  // Create session token and set httpOnly cookie
  const token = await createSessionToken(newUser);
  await setAuthCookie(token);

  redirect('/dashboard');
}

export async function login(formData: FormData): Promise<AuthResult> {
  const ip = await getClientIp();
  const emailInput = ((formData.get('email') as string) || '').toLowerCase().trim();

  // Rate limiting by IP and email
  const ipLimit = await checkRateLimit(`ip:${ip}`);
  if (!ipLimit.allowed) {
    return { error: ipLimit.message };
  }

  if (emailInput) {
    const emailLimit = await checkRateLimit(`email:${emailInput}`);
    if (!emailLimit.allowed) {
      return { error: emailLimit.message };
    }
  }

  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  await connectDB();

  const user = await User.findOne({ email: parsed.data.email.toLowerCase().trim() });

  if (!user) {
    await recordFailedAttempt(`ip:${ip}`);
    if (emailInput) await recordFailedAttempt(`email:${emailInput}`);
    // Generic error message to prevent account enumeration
    return { error: 'Invalid email or password' };
  }

  const isValidPassword = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!isValidPassword) {
    await recordFailedAttempt(`ip:${ip}`);
    await recordFailedAttempt(`email:${user.email}`);
    return { error: 'Invalid email or password' };
  }

  // Reset rate limits on success
  await clearRateLimit(`ip:${ip}`);
  await clearRateLimit(`email:${user.email}`);

  // Issue signed JWT in httpOnly cookie
  const token = await createSessionToken(user);
  await setAuthCookie(token);

  const redirectTo = (formData.get('redirectTo') as string) || '/dashboard';
  redirect(redirectTo.startsWith('/') ? redirectTo : '/dashboard');
}

export async function logout(): Promise<void> {
  await clearAuthCookie();
  redirect('/login');
}
