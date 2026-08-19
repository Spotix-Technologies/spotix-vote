import { ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "brass" | "ghost" | "outline"

const variants: Record<Variant, string> = {
  // text-on-accent (not text-ink): this button sits on the solid brand-purple
  // fill and needs to stay legible in both light and dark mode, unlike `ink`
  // which deliberately flips between white (light) and near-black (dark).
  brass:
    "bg-brass text-on-accent hover:bg-brass-soft disabled:bg-brass/40 disabled:text-on-accent/60",
  ghost:
    "bg-transparent text-paper hover:bg-brass/10 disabled:text-muted",
  outline:
    "bg-transparent border border-line text-paper hover:border-brass disabled:opacity-40",
}

export function Button({
  variant = "brass",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
