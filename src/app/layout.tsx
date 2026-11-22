import type { Metadata, Viewport } from "next";
import { Archivo, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { CONTACT } from "@/lib/contact";

// Fonts are downloaded at build time and served from your own domain (fast, no layout shift)
// Hanken Grotesk for reading, Archivo (slightly expanded) for headings and numbers: athletic, premium, calm.
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const heading = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-heading", display: "swap" });

const description = "VOXI is the premium all-in-one ERP for gyms in Qatar: members, memberships, biometric access, payments in QAR, classes, trainers and reports.";

export const metadata: Metadata = {
  metadataBase: new URL(CONTACT.site),
  title: { default: "VOXI | Gym Management for Qatar", template: "%s · VOXI" },
  description,
  applicationName: "VOXI",
  appleWebApp: { capable: true, title: "VOXI", statusBarStyle: "default" },
  openGraph: { type: "website", siteName: "VOXI", title: "VOXI | Gym Management for Qatar", description, locale: "en_QA" },
  twitter: { card: "summary_large_image", title: "VOXI | Gym Management for Qatar", description },
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
