import type { Config } from "tailwindcss";

// Palette calée sur l'identité Citiz (citiz.coop) : turquoise, anthracite, blanc.
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
        sans: ["var(--font-fira)", "system-ui", "sans-serif"],
        display: ["var(--font-fira)", "system-ui", "sans-serif"],
        mono: ["var(--font-fira-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        paper: { DEFAULT: "#ffffff", 2: "#f5f8f8", 3: "#e9f0f0" },
        ink: { DEFAULT: "#202020", dim: "#5d6767", soft: "#8b9595" },
        teal: { DEFAULT: "#32b4b5", deep: "#20a4b0", ink: "#11686c", tint: "#dbf4f4" },
        leaf: "#2fac66",
        coral: "#ee6352",
        primary: {
          50: "#effafa",
          100: "#dbf4f4",
          200: "#b5e7e7",
          300: "#82d4d5",
          400: "#4fc0c1",
          500: "#32b4b5",
          600: "#20a4b0",
          700: "#178590",
          800: "#11686c",
          900: "#0d4c4f",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(32,32,32,0.04), 0 8px 30px rgba(32,32,32,0.08)",
        lift: "0 2px 6px rgba(32,32,32,0.06), 0 24px 60px rgba(17,104,108,0.16)",
      },
    },
  },
  plugins: [],
};
export default config;
