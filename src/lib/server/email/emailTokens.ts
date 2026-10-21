/**
 * RateUrProfs Neo-Brutalist Email Design Tokens
 *
 * Derived 1:1 from the live website design system (`src/app/globals.css`):
 * - Neo-Brutalist sharp geometry: STRICT 100% SQUARE CORNERS (0px radius).
 * - High-contrast black borders: 2px solid #111111.
 * - RateUrProfs Editorial Red: #e03a3e.
 * - Website signature pastel accents: Soft Highlighter Yellow (#fef9c3), Soft Pastel Blue (#e0f2fe), Soft Coral (#fee2e2), Mint (#6ee7b7).
 * - Monospace tags & uppercase tracking for technical labels.
 */

export const EMAIL_DESIGN_TOKENS = {
  colors: {
    brandRed: "#e03a3e",
    brandRedDark: "#b91c1c",
    borderBlack: "#111111",
    bgPage: "#f4f4f5",
    bgCard: "#ffffff",
    bgHeader: "#141414",
    yellowAccent: "#fef9c3",
    blueAccent: "#e0f2fe",
    coralAccent: "#fee2e2",
    mintAccent: "#6ee7b7",
    textPrimary: "#111111",
    textMuted: "#52525b",
    textLight: "#ffffff",
    linkBlue: "#0c4a6e",
  },
  typography: {
    fontSans:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontMono:
      "'JetBrains Mono', 'SF Mono', Consolas, 'Courier New', monospace",
  },
  borders: {
    thick: "2px solid #111111",
    thin: "1.5px solid #111111",
    divider: "1px solid #e4e4e7",
    radius: "0px", // Strict 100% sharp square UI
  },
  shadows: {
    button: "3px 3px 0px #111111",
    card: "4px 4px 0px #111111",
    badge: "1.5px 1.5px 0px #111111",
  },
};

/**
 * Returns the trusted public base URL for links in emails.
 */
export function getEmailBaseUrl(): string {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  return "https://rateurprofs.site";
}
