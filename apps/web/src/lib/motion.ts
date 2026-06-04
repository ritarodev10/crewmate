/**
 * Motion constants — all animated components import from here, never use bare numbers.
 * Duration values are in seconds for use with the Motion library (framer-motion rebrand).
 *
 * CSS counterparts live in tokens.css: --motion-fast, --motion-base, --motion-slow
 */

export const motionFast = 0.12; // 120ms — hover, focus, color transitions
export const motionBase = 0.18; // 180ms — drawer slide, dialog scale, most enters/exits
export const motionSlow = 0.28; // 280ms — page-level transitions, large surfaces

export const easeStandard = [0.2, 0, 0, 1] as const;

export const motionVariants = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideRight: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
  },
} as const;
