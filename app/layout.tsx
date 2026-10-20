import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import AppShell from '@/components/AppShell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Proxima — Bordeaux Métropole',
  description: "Qui a une mobilité à 5 minutes à pied, et où investir pour en ajouter ? Hackathon Mobilité 2026.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body className="font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
