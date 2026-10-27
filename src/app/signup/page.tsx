'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { signUp } from '@/app/auth/actions';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await signUp(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.success);
      }
    });
  }

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
            Start tracking your gains
          </p>
        </div>

        <div className="glass-card p-8 border-[2.5px] border-black shadow-[5px_5px_0px_#000000] rounded-2xl">
          <h2 className="text-xl font-bold mb-6 text-black">Create account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-100 border-2 border-black text-black text-sm shadow-[2px_2px_0px_#000]">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-green-100 border-2 border-black text-black text-sm shadow-[2px_2px_0px_#000]">
              {success}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="label">Display Name</label>
              <input
                id="signup-name"
                name="display_name"
                type="text"
                required
                autoComplete="name"
                className="input-field"
                placeholder="Alex Lifter"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="label">Email</label>
              <input
                id="signup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="label">Password (min 8 chars)</label>
              <input
                id="signup-password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary w-full mt-2"
            >
              {isPending ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-600">
            Already have an account?{' '}
            <Link href="/login" className="text-black font-bold underline underline-offset-2">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
