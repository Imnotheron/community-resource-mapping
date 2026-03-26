import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import ClickSpark from "@/components/effects/ClickSpark";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Community Resource Mapping System - San Policarpo, Eastern Samar",
  description: "A comprehensive system for identifying, tracking, and supporting vulnerable groups with real-time mapping and relief distribution tracking.",
  keywords: ["Community", "Resource Mapping", "Vulnerable Groups", "PWD", "San Policarpo", "Eastern Samar", "Relief Distribution"],
  authors: [{ name: "San Policarpo LGU" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Community Resource Mapping System",
    description: "Supporting vulnerable communities in San Policarpo, Eastern Samar",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="crms-theme"
        >
          <ClickSpark sparkColor="#3b82f6" sparkSize={15} sparkRadius={20} sparkCount={12} duration={500}>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </ClickSpark>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
