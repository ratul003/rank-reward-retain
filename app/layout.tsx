import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rank, Reward, Retain - Wahid Tawsif Ratul",
  description: "How I built the expert scoring, compensation design, and retention framework that took Coto from zero supply intelligence to 300+ verified experts and 95% supply retention.",
  metadataBase: new URL('https://rank-reward-retain.vercel.app'),
  openGraph: {
    title: 'Rank, Reward, Retain',
    description: 'TOPSIS expert scoring, dynamic revenue share, and creator analytics - the supply intelligence layer for Coto.',
    url: 'https://rank-reward-retain.vercel.app',
    siteName: 'Wahid Tawsif Ratul',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rank, Reward, Retain',
    description: 'TOPSIS expert scoring, dynamic revenue share, and creator analytics - the supply intelligence layer for Coto.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
