import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Strates — Nutrition & Workout Panels',
  description:
    'Strates: All-in-one nutrition tracking and workout logging app.',
  keywords: ['Strates', 'nutrition tracker', 'workout logger', 'PR detection'],
};

export const viewport: Viewport = {
  themeColor: '#ffe600',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
