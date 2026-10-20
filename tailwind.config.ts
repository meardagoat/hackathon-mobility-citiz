import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        night: { DEFAULT: "#06080d", 2: "#0b0f17", 3: "#121826" },
        ink: { DEFAULT: "#e8edf5", dim: "#8a94a6" },
        served: "#3de0ff",
        citiz: "#b28cff",
        ember: "#ff5c7a",
        volt: "#d4ff3a",
        primary: {
          50: "#f7ffe0",
          100: "#eeffc2",
          200: "#e2ff8a",
          300: "#d9ff5c",
          400: "#d4ff3a",
          500: "#c2f01f",
          600: "#9fcb0d",
          700: "#7a9c0b",
          800: "#5c7510",
          900: "#3f5011",
        },
      },
    },
  },
  plugins: [],
};
export default config;
