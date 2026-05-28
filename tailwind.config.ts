import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontSize: {
        'xs': 'clamp(0.7rem, 0.65rem + 0.25vw, 0.75rem)',
        'sm': 'clamp(0.8rem, 0.75rem + 0.25vw, 0.875rem)',
        'base': 'clamp(0.95rem, 0.9rem + 0.25vw, 1rem)',
        'lg': 'clamp(1.05rem, 1rem + 0.25vw, 1.125rem)',
        'xl': 'clamp(1.15rem, 1.05rem + 0.5vw, 1.25rem)',
        '2xl': 'clamp(1.3rem, 1.1rem + 1vw, 1.5rem)',
        '3xl': 'clamp(1.6rem, 1.3rem + 1.5vw, 1.875rem)',
        '4xl': 'clamp(1.9rem, 1.5rem + 2vw, 2.25rem)',
        '5xl': 'clamp(2.5rem, 1.8rem + 3.5vw, 3rem)',
        '6xl': 'clamp(3rem, 2.2rem + 4vw, 3.75rem)',
        '7xl': 'clamp(3.5rem, 2.5rem + 5vw, 4.5rem)',
        '8xl': 'clamp(4.5rem, 3rem + 7.5vw, 6rem)',
        '9xl': 'clamp(6rem, 4.5rem + 10vw, 8rem)',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        gujarati: ['Noto Sans Gujarati', 'Poppins', 'sans-serif'],
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Government Specific Colors
        govt: {
          navy: "hsl(var(--govt-navy))",
          saffron: "hsl(var(--govt-saffron))",
          white: "hsl(var(--govt-white))",
          green: "hsl(var(--govt-green))",
        },
        // Status Colors (Indian Flag)
        status: {
          pending: "hsl(var(--status-pending))",
          progress: "hsl(var(--status-progress))",
          completed: "hsl(var(--status-completed))",
        },
        // Semantic UI Colors
        success: "hsl(var(--govt-green))",
        warning: "hsl(var(--govt-saffron))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
      boxShadow: {
        'govt': '0 4px 20px -2px hsl(216 100% 14% / 0.15)',
        'saffron': '0 4px 20px -2px hsl(30 100% 60% / 0.25)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
