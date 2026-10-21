import type { Metadata } from 'next';
import { Fira_Sans, Fira_Mono } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import AppShell from '@/components/AppShell';

// Fira Sans : alternative libre la plus proche de Vista Sans, la typographie de Citiz
const fira = Fira_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'], variable: '--font-fira' });
const firaMono = Fira_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-fira-mono' });

export const metadata: Metadata = {
  title: 'Proxima — Bordeaux Métropole',
  description: "Où ouvrir les prochaines stations d'autopartage ? Projet Hackathon Mobilité 2026 (Citiz × Microsoft × Epitech).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fira.variable} ${firaMono.variable}`}>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
