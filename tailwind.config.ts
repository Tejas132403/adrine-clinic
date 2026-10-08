import type { Config } from "tailwindcss";

/**
 * Design tokens for the clinic product.
 * The palette is intentionally narrow: one clinical teal accent, a neutral
 * slate scale for structure, and reserved status colours (see DESIGN.md).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effaf8",
          100: "#d3f2ec",
          200: "#a9e4dc",
          300: "#77cec6",
          400: "#43b1a9",
          500: "#1e968e",
          600: "#0e7c75",
          700: "#0d635e",
          800: "#0e4f4c",
          900: "#0f4240",
        },
        ink: {
          DEFAULT: "#0f172a",
          muted: "#475569",
          soft: "#64748b",
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f8fafc",
          muted: "#f1f5f9",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        pop: "0 10px 30px -12px rgb(15 23 42 / 0.25)",
      },
      borderRadius: {
        card: "0.625rem",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 160ms ease-out",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
