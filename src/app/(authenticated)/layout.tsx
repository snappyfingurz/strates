import { requireUser } from '@/lib/auth';
import { Sidebar } from './sidebar';

export const dynamic = 'force-dynamic';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-[#dcdfe5] text-black">
      <Sidebar
        user={{
          id: user.userId,
          email: user.email,
          display_name: user.displayName || user.email.split('@')[0],
          role: user.role,
        }}
      />
      <main className="flex-1 ml-0 md:ml-64 min-h-screen bg-[#dcdfe5]">
        <div className="p-4 md:p-8 max-w-7xl mx-auto page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
