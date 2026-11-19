import type { Metadata, Viewport } from "next";
import {headers} from 'next/headers';
import {TrafficAnalytics} from '../components/traffic-analytics';
import "./globals.css";
import "./workflow.css";
import "./desk.css";

export const metadata: Metadata = {
  applicationName: 'FormFino',
  manifest: '/manifest.webmanifest',
  appleWebApp: {capable:true,title:'FormFino',statusBarStyle:'default'},
  title: "FormFino — Application files and fillable PDFs",
  description: "Turn a screenshot of upload requirements into correctly sized photos, signatures and PDFs. Review the details, prepare your files privately, and download one application pack.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: '/icons/apple-touch-icon.png',
  },
};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#182741'};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Per-request rendering lets Next attach the CSP nonce to its bootstrap scripts.
  await headers();
  return (
    <html lang="en">
      <head><link rel="preload" href="/fonts/source-sans-3-latin-v20.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head>
      <body className="antialiased">{children}<TrafficAnalytics enabled={process.env.VERCEL_ENV==='production'}/></body>
    </html>
  );
}
