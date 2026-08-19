import type { Metadata } from "next"
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/theme/theme-context"
import { THEME_NO_FLASH_SCRIPT } from "@/lib/theme/no-flash-script"

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

export const metadata: Metadata = {
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
      <head>
        {/* Runs before hydration so the correct theme class is already on
            <html> for first paint — see lib/theme/no-flash-script.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }} />
      </head>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
