import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  title: "MealBoard"
};

export const viewport: Viewport = {
  themeColor: "#0f766e"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
