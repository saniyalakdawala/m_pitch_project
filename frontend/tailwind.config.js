/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: "#FAF9F6",
          100: "#F7F5F0", // primary warm ivory background
          200: "#EFECE6",
          300: "#E5E0D8", // thin subtle borders
          400: "#DCD6CC",
        },
        navy: {
          50: "#F2F5FA",
          100: "#E4EBF5",
          200: "#C8D7EB",
          300: "#9FBCE0",
          400: "#5D8EC7",
          500: "#007CA6",
          600: "#005587", // Marsh Brand Blue
          700: "#17347A",
          800: "#0E255F",
          900: "#071A49", // deep navy primary text / CTA button
          950: "#040E28",
        },
        muted: {
          DEFAULT: "#5C6880",
          light: "#7B869C",
          dark: "#3E495E",
        },
        gold: {
          500: "#996515", // understated gold only for audit badge
          100: "#FBF5E8",
        },
      },
      fontFamily: {
        serif: ["'Playfair Display'", "'Newsreader'", "Georgia", "serif"],
        sans: ["'Plus Jakarta Sans'", "Inter", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(7, 26, 73, 0.04), 0 1px 2px rgba(7, 26, 73, 0.02)",
        card: "0 2px 8px rgba(7, 26, 73, 0.04)",
      },
    },
  },
  plugins: [],
};
