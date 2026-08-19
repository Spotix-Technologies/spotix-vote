"use client"

/**
 * src/lib/theme/theme-context.tsx
 *
 * Lightweight light/dark theme provider — no next-themes dependency, just
 * a React context + a `dark` class toggled on <html>. Colors themselves
 * live in globals.css as CSS custom properties (`--color-*`), redefined
 * inside `.dark { ... }` — this provider only ever flips that one class,
 * it never touches individual color values directly.
 *
 * The brand purple (#6b2fa5, the `brass`/`purple` tokens) stays constant
 * across both themes on purpose — only the surface (ink/paper/line/muted)
 * tokens change. See globals.css for the actual palette.
 *
 * Pairs with the inline no-flash script in layout.tsx, which reads the
 * same localStorage key synchronously before hydration so the page never
 * paints the wrong theme for a frame.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

export type Theme = "light" | "dark"

export const THEME_STORAGE_KEY = "spotix-vote-theme"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === "light" || stored === "dark" ? stored : null
  } catch {
    return null
  }
}

function readSystemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts "light" to match server render + the inline script's default,
  // then syncs to whatever's actually stored/preferred once mounted.
  const [theme, setThemeState] = useState<Theme>("light")

  useEffect(() => {
    setThemeState(readStoredTheme() ?? readSystemTheme())
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* private browsing / storage disabled — theme just won't persist */
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), [])

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
