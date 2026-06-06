import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  // HALO brand — utilities da fundação que ainda não têm uso no JSX (vão
  // ser aplicadas em camadas seguintes: eyebrow nas seções, glass no
  // dashboard, fade-up no hero do login). Sem safelist o JIT remove.
  safelist: ["halo-eyebrow", "halo-glass", "animate-halo-fade-up"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        // HALO body: Open Sans 300/400/600 — leve, espaçada, premium
        sans: [
          "var(--font-open-sans)",
          "'Open Sans'",
          "Helvetica",
          "system-ui",
          "sans-serif",
        ],
        // HALO display: Helvetica Neue Bold em títulos H1/H2 (uppercase)
        display: [
          "'Helvetica Neue'",
          "Helvetica",
          "var(--font-open-sans)",
          "'Open Sans'",
          "Arial",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // HALO brand
        halo: {
          blue: "#0071E3",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // HALO brand — cards grandes 18px, cards menores 12px
        halo: "18px",
        "halo-sm": "12px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // HALO brand — fade-up suave usado em heros e seções (.fu)
        "halo-fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "halo-fade-up": "halo-fade-up 0.6s ease both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
