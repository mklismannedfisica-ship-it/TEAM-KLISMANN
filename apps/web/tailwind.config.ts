import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0a0d",
          900: "#111114",
          800: "#1a1a1f",
          700: "#26262d",
          600: "#3a3a44",
          400: "#8b8b96",
          200: "#d4d4dc",
          100: "#eeeef2",
        },
        volt: {
          DEFAULT: "#c6ff3d",
          600: "#a8e01f",
          500: "#c6ff3d",
          400: "#d6ff70",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
