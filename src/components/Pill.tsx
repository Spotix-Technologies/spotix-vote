export function Pill({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "brass" | "danger" | "success"
  children: React.ReactNode
}) {
  const tones: Record<string, string> = {
    muted: "border-line text-muted",
    brass: "border-brass/60 text-brass-soft bg-brass/10",
    danger: "border-danger/60 text-danger bg-danger/10",
    success: "border-success/60 text-success bg-success/10",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide font-mono ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
