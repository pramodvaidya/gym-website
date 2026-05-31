import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { initializeInternalCron } from '@/lib/cronScheduler';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

initializeInternalCron();

export const metadata = {
  title: 'GymPro — Gym Management System',
  description: 'Manage your gym members, track subscriptions, and view financial analytics with GymPro.',
  keywords: 'gym management, membership tracking, gym software',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`light-theme ${inter.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
