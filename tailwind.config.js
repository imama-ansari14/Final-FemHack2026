/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1220",
          900: "#101828",
          800: "#1C2536",
          700: "#2A3549",
        },
        teal: {
          50: "#EEFBF8",
          100: "#D2F4EC",
          400: "#2DBAA0",
          500: "#0F9C86",
          600: "#0C7F6E",
          700: "#0B6759",
        },
        amber: {
          50: "#FFF8EB",
          400: "#F0A93A",
          600: "#C77C15",
        },
        coral: {
          50: "#FDF0EE",
          400: "#E6684F",
          600: "#C4442D",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
};
