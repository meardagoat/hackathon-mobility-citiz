import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SidebarLayout from '@/components/SidebarLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MobilityAI — Hackathon',
  description: 'Plateforme de recommandations de mobilité urbaine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  );
}
