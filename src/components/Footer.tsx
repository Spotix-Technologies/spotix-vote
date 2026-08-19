/**
 * src/components/Footer.tsx
 *
 * Plain copyright footer, shared by the poll and nominate pages.
 */
export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-line py-8 text-center">
      <p className="text-xs text-muted">
        © {year} Spotix Technologies. All rights reserved.
      </p>
    </footer>
  )
}
