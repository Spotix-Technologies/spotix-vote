/**
 * .../eform-pdf/pdfTheme.ts
 *
 * Spotix brand constants for the e-form PDF, kept as plain [r,g,b]
 * tuples (0-255) since that's what jsPDF's setFillColor/setTextColor
 * take directly — mirrors the brand-purple used everywhere else in the
 * app (globals.css --color-brass: #6b2fa5), just expressed the way
 * jsPDF wants it instead of as a CSS custom property.
 */

export const PDF_COLORS = {
  brass: [107, 47, 165] as [number, number, number], // #6b2fa5
  brassSoft: [139, 79, 201] as [number, number, number], // #8b4fc9
  ink: [29, 23, 48] as [number, number, number], // #1d1730 — near-black text
  muted: [107, 98, 128] as [number, number, number], // #6b6280
  paper: [255, 255, 255] as [number, number, number],
  line: [222, 209, 240] as [number, number, number],
  success: [34, 145, 94] as [number, number, number],
}

export const PDF_PAGE = {
  widthMm: 210, // A4
  heightMm: 297,
  marginMm: 18,
}

export const PDF_FONT = {
  display: "helvetica", // jsPDF ships helvetica/times/courier only — no custom font embedding needed for this doc
}
