import type { Metadata, Viewport } from "next";
import { Lato, Roboto, Roboto_Mono } from "next/font/google";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

/**
 * Typeface roles.
 *
 * Lato carries headings, at 700 and 900 where it has real presence.
 * Roboto takes the interface: body copy, labels, controls, table text.
 * Roboto Mono takes figures, so columns of numbers line up.
 *
 * All three are loaded through next/font, which self-hosts them and inlines
 * the face declarations. A stylesheet @import from fonts.googleapis.com would
 * block render on a third-party round trip and reintroduce the swap it avoids.
 */
const lato = Lato({
  variable: "--ff-display",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--ff-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--ff-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const TITLE = "Meridian, a yard operations console";
const DESCRIPTION =
  "A real-time operations console for container terminals. The yard model is the chart: stack height reads ground-slot occupancy, stack colour reads mean dwell. Twelve blocks, six quay cranes, one store. Built by Pixlotech.";

export const metadata: Metadata = {
  metadataBase: new URL("https://meridian-terminal.example.com"),
  title: {
    default: TITLE,
    template: "%s | Meridian",
  },
  description: DESCRIPTION,
  applicationName: "Meridian",
  keywords: [
    "terminal operating system",
    "container terminal",
    "yard management",
    "port operations",
    "3D dashboard",
    "real-time analytics",
  ],
  authors: [{ name: "Pixlotech", url: "https://pixlotech.com" }],
  creator: "Pixlotech",
  publisher: "Pixlotech",
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Meridian by Pixlotech",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale / userScalable: pinch-zoom stays available.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1219" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body
        className={`${lato.variable} ${roboto.variable} ${robotoMono.variable}`}
      >
        <a className="skip-link" href="#console">
          Skip to console
        </a>
        {children}
      </body>
    </html>
  );
}
