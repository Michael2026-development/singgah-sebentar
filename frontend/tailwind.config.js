/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "primary": "#1dc956",
        "primary-dark": "#0A3613",
        "primary-deep": "#051608",
        "brand-dark": "#0A3613",
        "brand-beige": "#f5f5f1",
        "background-light": "#f6f8f6",
        "background-dark": "#0B1218",
        "surface-dark": "#121A21",
        "border-dark": "rgba(255,255,255,0.05)",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
    },
  },
  plugins: [],
};
