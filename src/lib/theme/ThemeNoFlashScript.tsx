"use client"

import { useServerInsertedHTML } from "next/navigation"
import { THEME_NO_FLASH_SCRIPT } from "./no-flash-script"

export function ThemeNoFlashScript() {
  useServerInsertedHTML(() => (
    <script id="theme-no-flash" dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }} />
  ))
  return null
}
