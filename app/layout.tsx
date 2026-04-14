import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { PWARegister } from "@/components/pwa-register";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#c41432",
};

export const metadata: Metadata = {
  title: "SOP",
  description: "Gestão operacional de restaurantes (Back-of-House)",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SOP",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SOP" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#c41432" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ClerkProvider>
          <PWARegister />
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
