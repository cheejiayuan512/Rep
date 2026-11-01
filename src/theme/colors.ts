/**
 * Semantic colors aligned with Apple HIG dark system colors.
 * Brand lime stays scarce for primary CTAs (Finish, check done, pad Next, PR).
 * Hex keeps SVG, widgets, and Android consistent; names match UIKit tokens.
 */
export const colors = {
  /** systemBackground */
  bg: '#000000',
  /** secondarySystemBackground */
  surface: '#1C1C1E',
  /** tertiarySystemBackground */
  surfaceRaised: '#2C2C2E',
  /** separator */
  border: '#3A3A3C',
  /** label */
  text: '#FFFFFF',
  /** secondaryLabel */
  muted: 'rgba(235, 235, 245, 0.6)',
  /** tertiaryLabel — decorative only; prefer muted for captions */
  faint: 'rgba(235, 235, 245, 0.3)',
  /** Brand accent — primary actions only */
  accent: '#D6FF4A',
  accentPressed: '#C3EB38',
  accentInk: '#12160A',
  /** systemRed */
  danger: '#FF453A',
  /** systemGreen */
  success: '#30D158',
  overlay: 'rgba(0, 0, 0, 0.72)',
};
