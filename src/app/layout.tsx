import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-manrope"
});

export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MealBoard"
  },
  applicationName: "MealBoard",
  description: "Private family meal planning and grocery list app.",
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { sizes: "192x192", type: "image/png", url: "/icons/icon-192.png" },
      { sizes: "512x512", type: "image/png", url: "/icons/icon-512.png" }
    ]
  },
  manifest: "/manifest.webmanifest",
  title: {
    default: "MealBoard",
    template: "%s | MealBoard"
  }
};

export const viewport: Viewport = {
  themeColor: "#021b0d"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={manrope.variable} lang="en">
      <body>{children}</body>
    </html>
  );
}
