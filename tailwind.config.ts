import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Relay brand — indigo / violet
        brand: {
          50: "#f1f0ff",
          100: "#e5e3ff",
          200: "#cdc9ff",
          300: "#ada6ff",
          400: "#8b7dff",
          500: "#6d5efc",
          600: "#5a45f0",
          700: "#4c37d6",
          800: "#3f30ab",
          900: "#372d87",
        },
        // Accent — teal, used for positive / "moving" signals
        accent: {
          50: "#ecfdf7",
          100: "#d1fae9",
          200: "#a7f3d4",
          300: "#6ee7bb",
          400: "#34d39e",
          500: "#10b986",
          600: "#059666",
          700: "#047852",
          800: "#065f43",
          900: "#064e38",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        lift: "0 10px 30px -12px rgb(67 56 202 / 0.25)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6d5efc 0%, #8b7dff 50%, #34d39e 130%)",
        "brand-radial": "radial-gradient(120% 120% at 0% 0%, #5a45f0 0%, #6d5efc 45%, #372d87 100%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
