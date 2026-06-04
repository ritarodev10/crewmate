/**
 * Tailwind 4 CSS-native configuration.
 *
 * Design tokens are declared in apps/web/src/styles/tokens.css using the
 * @theme block. Tailwind 4 reads CSS custom properties from @theme directly
 * and generates utility classes from them — no theme.extend needed here.
 *
 * This file exists to document the content paths explicitly.
 * All token → utility class mappings are in tokens.css.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
