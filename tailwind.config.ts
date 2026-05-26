import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Shadcn semantic tokens */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        /* Material Design 3 raw tokens (for direct use in className) */
        "surface":                    "#fdf7ff",
        "surface-dim":                "#ded8e0",
        "surface-bright":             "#fdf7ff",
        "surface-container-lowest":   "#ffffff",
        "surface-container-low":      "#f8f2fa",
        "surface-container":          "#f2ecf4",
        "surface-container-high":     "#ece6ee",
        "surface-container-highest":  "#e6e0e9",
        "surface-variant":            "#e6e0e9",
        "on-surface":                 "#1d1b20",
        "on-surface-variant":         "#494551",
        "on-background":              "#1d1b20",
        "outline":                    "#7a7582",
        "outline-variant":            "#cbc4d2",
        "inverse-surface":            "#322f35",
        "inverse-on-surface":         "#f5eff7",
        "surface-tint":               "#6750a4",
        "primary-fixed":              "#e9ddff",
        "primary-fixed-dim":          "#cfbcff",
        "on-primary-fixed":           "#22005d",
        "on-primary-fixed-variant":   "#4f378a",
        "primary-container":          "#6750a4",
        "on-primary-container":       "#e0d2ff",
        "inverse-primary":            "#cfbcff",
        "secondary-container":        "#e1d4fd",
        "on-secondary-container":     "#645a7d",
        "secondary-fixed":            "#e9ddff",
        "secondary-fixed-dim":        "#cdc0e9",
        "on-secondary-fixed":         "#1f1635",
        "on-secondary-fixed-variant": "#4b4263",
        "tertiary":                   "#765b00",
        "on-tertiary":                "#ffffff",
        "tertiary-container":         "#c9a74d",
        "on-tertiary-container":      "#503d00",
        "tertiary-fixed":             "#ffdf93",
        "tertiary-fixed-dim":         "#e7c365",
        "on-tertiary-fixed":          "#241a00",
        "on-tertiary-fixed-variant":  "#594400",
        "error-container":            "#ffdad6",
        "on-error-container":         "#93000a",
        "on-secondary":               "#ffffff",
        "on-primary":                 "#ffffff",
        "on-error":                   "#ffffff",
        "on-tertiary-fixed-var":      "#594400",

        /* Chart colors */
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },

        /* Sidebar */
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '10px',
        md: '8px',
        sm: '6px',
        xl: '12px',
        full: '9999px',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      fontSize: {
        'display-lg':      ['48px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg':     ['32px', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md':     ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'headline-sm':     ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg':         ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md':         ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-md':        ['14px', { lineHeight: '1.4', letterSpacing: '0.02em', fontWeight: '500' }],
        'metric-sm':       ['14px', { lineHeight: '1.2', fontWeight: '500' }],
      },
      spacing: {
        'margin-desktop': '3rem',
        'margin-mobile':  '1rem',
        'gutter':         '1.5rem',
      },
      boxShadow: {
        'organic':   '0 2px 4px rgba(0,0,0,0.02), 0 12px 24px rgba(0,0,0,0.04)',
        'organic-lg':'0 4px 6px rgba(0,0,0,0.04), 0 20px 40px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
