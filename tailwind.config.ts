import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          200: "#bac8ff",
          300: "#91a7ff",
          400: "#748ffc",
          500: "#5c7cfa",
          600: "#4c6ef5",
          700: "#4263eb",
          800: "#3b5bdb",
          900: "#364fc7",
          950: "#1e3a8a",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in-up": "fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in-down": "fadeInDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left": "slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-up": "scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        glow: "glow 2s ease-in-out infinite alternate",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "float-delayed": "float 7s ease-in-out infinite 2s",
        "spin-slow": "spin 8s linear infinite",
        shimmer: "shimmer 2s infinite",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
        "bounce-subtle": "bounceSubtle 2s ease-in-out infinite",
        "count-up": "countUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        "border-glow": "borderGlow 3s ease-in-out infinite",
        "gradient-x": "gradientX 8s ease infinite",
        typewriter: "typewriter 0.5s steps(20) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        scaleUp: {
          "0%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(92, 124, 250, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(92, 124, 250, 0.4)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(92, 124, 250, 0.15)" },
          "50%": { boxShadow: "0 0 24px rgba(92, 124, 250, 0.35)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.8)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(92, 124, 250, 0.2)" },
          "50%": { borderColor: "rgba(92, 124, 250, 0.5)" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        typewriter: {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
      },
      boxShadow: {
        glow: "0 0 15px rgba(92, 124, 250, 0.3)",
        "glow-lg": "0 0 30px rgba(92, 124, 250, 0.4)",
        "glow-brand": "0 4px 24px rgba(92, 124, 250, 0.25)",
        "glow-emerald": "0 4px 24px rgba(16, 185, 129, 0.25)",
        "glow-purple": "0 4px 24px rgba(139, 92, 246, 0.25)",
        soft: "0 2px 15px rgba(0, 0, 0, 0.05)",
        "soft-lg": "0 8px 30px rgba(0, 0, 0, 0.08)",
        card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)",
        "card-hover":
          "0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(var(--tw-gradient-stops))",
        "mesh-gradient": "radial-gradient(at 40% 20%, rgba(92, 124, 250, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(139, 92, 246, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(16, 185, 129, 0.06) 0px, transparent 50%)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
    },
  },
  plugins: [],
};

export default config;
