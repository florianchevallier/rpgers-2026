import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
  title: {
    default: "RPGers 2026",
    template: "%s · RPGers",
  },
  description:
    "Consultez le programme, trouvez une partie et gérez votre planning RPGers 2026.",
  applicationName: "RPGers",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RPGers",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    title: "RPGers 2026",
    description:
      "Consultez le programme, trouvez une partie et gérez votre planning.",
    images: [
      {
        url: "/og.png",
        width: 1731,
        height: 909,
        alt: "RPGers 2026 — 14 au 16 août",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RPGers 2026",
    description:
      "Consultez le programme, trouvez une partie et gérez votre planning.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geist.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NuqsAdapter>{children}</NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
