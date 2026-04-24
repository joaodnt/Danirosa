import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#E9EBE4",
          100: "#D1D6C4",
          200: "#A9B196",
          300: "#7C7F59",
          400: "#62644C",
          500: "#4E5B3A",
          600: "#3A4A2E",
          700: "#2D3E24",
          800: "#232011",
          900: "#1A1D17",
          950: "#0A0D0A"
        },
        ink: {
          50: "#DED2C6",
          100: "#C7C3B9",
          200: "#AD9F8D",
          300: "#897F68"
        },
        accent: {
          earth: "#402D1D",
          terracotta: "#936221",
          gold: "#C8A14B"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        handwritten: ["var(--font-handwritten)", "Caveat", "cursive"]
      }
    }
  },
  plugins: []
} satisfies Config;
