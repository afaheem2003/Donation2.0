import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#E0F7F5",
          100: "#B3EDE9",
          200: "#80E0DA",
          300: "#4DD3CA",
          400: "#26C8BD",
          500: "#00B4A6",
          600: "#00A396",
          700: "#007A70",
          800: "#005550",
          900: "#003330",
        },
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "15%":       { transform: "translateX(-5px)" },
          "30%":       { transform: "translateX(5px)" },
          "45%":       { transform: "translateX(-5px)" },
          "60%":       { transform: "translateX(5px)" },
          "75%":       { transform: "translateX(-3px)" },
          "90%":       { transform: "translateX(3px)" },
        },
      },
      animation: {
        shake: "shake 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
};
export default config;
