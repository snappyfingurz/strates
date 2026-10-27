import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectDB } from './db';
import { User, IUser } from './models/User';

export const AUTH_COOKIE_NAME = 'auth_token';
const BCRYPT_SALT_ROUNDS = 12;

export interface SessionUser {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  displayName: string;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is missing in production');
    }
    // Fallback for local development if not set
    return new TextEncoder().encode('strates-dev-fallback-secret-key-32chars-min!!');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Hashes a password using bcrypt with cost 12.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, BCRYPT_SALT_ROUNDS);
}

/**
 * Compares a plain password against a bcrypt hash.
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Creates and signs a JWT for the authenticated user.
 */
export async function createSessionToken(user: IUser): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({
    role: user.role,
    email: user.email,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user._id.toString())
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/**
 * Verifies a JWT session token and returns the payload if valid.
 */
export async function verifySessionToken(token: string): Promise<{ sub: string; role: 'user' | 'admin'; email: string } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      role: payload.role as 'user' | 'admin',
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

/**
 * Sets the httpOnly session cookie.
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clears the session cookie on logout.
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Extracts and verifies the session from the request cookies, validating against MongoDB.
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload?.sub) return null;

    await connectDB();
    const dbUser = await User.findById(payload.sub).select('_id email displayName role').lean();
    if (!dbUser) return null;

    return {
      userId: dbUser._id.toString(),
      email: dbUser.email,
      role: dbUser.role,
      displayName: dbUser.displayName,
    };
  } catch {
    return null;
  }
}

/**
 * Requires an authenticated user session. Redirects to /login if unauthenticated.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/**
 * Requires an admin session. Throws error if not authenticated or not an admin.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return session;
}
