import { connectDB } from './db';
import { AuthAttempt } from './models/AuthAttempt';

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  message?: string;
}

const MAX_ATTEMPTS = 5;

/**
 * Checks if a given key (IP address or email) has exceeded failed attempt limits.
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  await connectDB();
  const normalizedKey = key.toLowerCase().trim();

  const record = await AuthAttempt.findOne({ key: normalizedKey });

  if (record && record.attempts >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      remainingAttempts: 0,
      message: 'Too many attempts. Account locked for 15 minutes. Please try again later.',
    };
  }

  const currentAttempts = record ? record.attempts : 0;
  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - currentAttempts),
  };
}

/**
 * Records a failed attempt for the specified key.
 */
export async function recordFailedAttempt(key: string): Promise<number> {
  await connectDB();
  const normalizedKey = key.toLowerCase().trim();

  const updated = await AuthAttempt.findOneAndUpdate(
    { key: normalizedKey },
    {
      $inc: { attempts: 1 },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true }
  );

  return updated.attempts;
}

/**
 * Resets failed attempts after a successful authentication.
 */
export async function clearRateLimit(key: string): Promise<void> {
  await connectDB();
  const normalizedKey = key.toLowerCase().trim();
  await AuthAttempt.deleteOne({ key: normalizedKey });
}
