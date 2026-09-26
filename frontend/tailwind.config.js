/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#e6eef5",
          100: "#c0d5e6",
          200: "#96b9d5",
          300: "#6a9cc3",
          400: "#4a86b6",
          500: "#2f70a8",
          600: "#005587",
          700: "#004570",
          800: "#00375a",
          900: "#022544",
        },
        slate: {
          25: "#f8fafc",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)",
        panel: "0 4px 24px rgba(2, 37, 68, 0.08)",
      },
    },
  },
  plugins: [],
};
