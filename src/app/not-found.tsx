import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center page-enter">
        <p className="text-8xl font-black text-brand-700 mb-4">404</p>
        <h1 className="text-2xl font-bold text-brand-200 mb-2">Page not found</h1>
        <p className="text-brand-500 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
