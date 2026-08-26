import type { Metadata } from "next"
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/theme/theme-context"
import { ThemeNoFlashScript } from "@/lib/theme/ThemeNoFlashScript"

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT", "WONK"],
  weight: "variable",
})

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
})

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
})

// Lets every generateMetadata() below use relative openGraph image paths
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Spotix Vote",
  description: "Cast your vote or nominate a contestant, powered by Spotix.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script below (and ThemeProvider
    // after hydration) both add/remove the `dark` class on <html> outside
    // of React's own render — without this, React logs a harmless but
    // noisy hydration mismatch warning for that one attribute.
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {/* Injects the theme no-flash script via useServerInsertedHTML
            (see ThemeNoFlashScript.tsx) so the correct theme class is
            already on <html> for first paint, without React treating it
            as a rendered <script> element — see that file's header
            comment for why that distinction matters. */}
        <ThemeNoFlashScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
