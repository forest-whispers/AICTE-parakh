/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F6F5F0",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#172E33",
          muted: "#5C6F73",
          subtle: "#8A9B9D",
          dark: "#0F2125",
        },
        institutional: {
          DEFAULT: "#165A60",
          hover: "#12494E",
          tint: "#EBF2F1",
          active: "#0E393D",
        },
        rule: {
          DEFAULT: "#D7DEDA",
          light: "#EAEFEA",
          dark: "#C3CBC7",
        },
        attention: {
          DEFAULT: "#94631F",
          tint: "#F8F3E8",
          rule: "#E6D7BD",
        },
        deficiency: {
          DEFAULT: "#A14637",
          tint: "#FBEBE8",
          rule: "#E9CDC8",
        },
        pass: {
          DEFAULT: "#376850",
          tint: "#EEF4F1",
          rule: "#C7DCD1",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "Consolas", "monospace"],
      },
      borderRadius: {
        DEFAULT: "3px",
        sm: "2px",
        md: "3px",
        lg: "4px",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(23, 46, 51, 0.05)",
        panel: "0 1px 3px rgba(23, 46, 51, 0.08)",
      },
    },
  },
  plugins: [],
}
