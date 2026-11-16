import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";

// Fonts are downloaded at build time and served from your own domain (fast, no layout shift)
const body = Manrope({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Sora({ subsets: ["latin"], variable: "--font-heading", display: "swap" });

export const metadata: Metadata = {
  title: { default: "VOXI — Gym Management for Qatar", template: "%s · VOXI" },
  description: "VOXI is the premium all-in-one ERP for gyms in Qatar: members, memberships, biometric access, payments in QAR, classes, trainers and reports.",
  applicationName: "VOXI",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a13" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Applies the saved theme before the page paints. VOXI defaults to the light theme.
const themeScript = `try{var t=localStorage.getItem('voxi-theme');if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
