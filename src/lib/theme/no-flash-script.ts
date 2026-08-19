/**
 * src/lib/theme/no-flash-script.ts
 *
 * Source for the tiny inline script layout.tsx injects into <head>. Runs
 * synchronously before React hydrates, so the `dark` class lands on
 * <html> before first paint — without this, the page briefly flashes the
 * default (light) theme even for someone who'd picked dark last time.
 *
 * Kept as a plain string (not a component) so it can go straight into a
 * <script dangerouslySetInnerHTML> — this MUST stay dependency-free and
 * synchronous, it runs before any of our React code exists yet.
 *
 * Must mirror THEME_STORAGE_KEY in ./theme-context.tsx exactly.
 */
export const THEME_NO_FLASH_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("spotix-vote-theme");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`.trim()
