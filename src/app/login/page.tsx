'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { login } from '@/app/auth/actions';

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const redirectTo = searchParams.get('redirectTo');

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="glass-card p-8 border-[2.5px] border-black shadow-[5px_5px_0px_#000000] rounded-2xl">
      <h2 className="text-xl font-bold mb-6 text-black">Log in</h2>

      {authError && (
        <div className="mb-4 p-3 rounded-xl bg-red-100 border-2 border-black text-black text-sm shadow-[2px_2px_0px_#000]">
          Authentication failed. Please try again.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-100 border-2 border-black text-black text-sm shadow-[2px_2px_0px_#000]">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

        <div>
          <label htmlFor="login-email" className="label">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input-field"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="label">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input-field"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary w-full mt-2"
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-black font-bold underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md page-enter">
        <div className="text-center mb-6">
          <div className="inline-block bg-white border-[2.5px] border-black px-6 py-2 rounded-2xl shadow-[4px_4px_0px_#000] mb-2">
            <h1 className="text-3xl font-black text-black">
              Strates
            </h1>
          </div>
          <p className="text-sm font-medium text-neutral-600">
            Track food &amp; lifting in one place
          </p>
        </div>

        <Suspense fallback={<div className="glass-card p-8 animate-pulse h-80" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
