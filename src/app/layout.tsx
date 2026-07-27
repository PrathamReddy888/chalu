import type { Metadata, Viewport } from "next";
import { Sora, Plus_Jakarta_Sans, Noto_Sans_Devanagari, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoDeva = Noto_Sans_Devanagari({
  variable: "--font-noto-deva",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chalu — Live Restaurant Ops",
  description:
    "Chalu closes the gap between what the kitchen has and what the customer thinks they can order — live 86'd sync, KOT pipeline, and honest wait times for a single Indian restaurant.",
  keywords: ["Chalu", "restaurant", "KOT", "live ops", "86'd", "India", "dine-in"],
  authors: [{ name: "Team Chalu" }],
  icons: { icon: "/logo.svg" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Chalu — Live Restaurant Ops",
    description: "The live-operations layer between the kitchen and the customer.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FBF7EF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sora.variable} ${jakarta.variable} ${notoDeva.variable} ${jetbrains.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
