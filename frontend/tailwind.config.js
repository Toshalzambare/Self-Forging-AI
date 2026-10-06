/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "secondary": "#b8c8db",
        "tertiary-container": "#a9bdc7",
        "on-tertiary-fixed-variant": "#374952",
        "surface": "#0d141e",
        "tertiary-fixed": "#d1e6f0",
        "primary-fixed": "#feddbb",
        "surface-dim": "#0d141e",
        "surface-container-low": "#151c27",
        "surface-container-highest": "#2e3541",
        "on-error": "#690005",
        "on-background": "#dce3f2",
        "secondary-container": "#3b4b5b",
        "outline": "#9a8f84",
        "error-container": "#93000a",
        "surface-container": "#19202b",
        "surface-container-high": "#232a35",
        "tertiary-fixed-dim": "#b5cad4",
        "on-primary": "#402d16",
        "on-secondary-fixed-variant": "#394858",
        "on-primary-container": "#5c462d",
        "inverse-on-surface": "#2a313c",
        "on-tertiary-fixed": "#0a1e26",
        "background": "#0d141e",
        "on-secondary-container": "#aabacd",
        "on-secondary-fixed": "#0c1d2b",
        "surface-container-lowest": "#070e19",
        "on-tertiary-container": "#3a4d55",
        "outline-variant": "#4e453d",
        "inverse-primary": "#725a3f",
        "surface-variant": "#2e3541",
        "on-tertiary": "#20333b",
        "surface-tint": "#e1c1a0",
        "surface-bright": "#333a45",
        "on-surface": "#dce3f2",
        "error": "#ffb4ab",
        "tertiary": "#c4d9e3",
        "secondary-fixed-dim": "#b8c8db",
        "primary": "#f1d0af",
        "on-secondary": "#223241",
        "secondary-fixed": "#d3e4f8",
        "on-surface-variant": "#d1c4b9",
        "on-error-container": "#ffdad6",
        "primary-fixed-dim": "#e1c1a0",
        "inverse-surface": "#dce3f2",
        "on-primary-fixed-variant": "#59432a",
        "primary-container": "#d4b595",
        "on-primary-fixed": "#291804"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "gutter": "1rem",
        "margin": "1.25rem",
        "space-xl": "2.5rem",
        "space-lg": "1.5rem",
        "space-md": "1rem",
        "space-sm": "0.5rem",
        "space-xs": "0.25rem"
      },
      fontFamily: {
        "headline-lg": ["Plus Jakarta Sans"],
        "label-sm": ["Plus Jakarta Sans"],
        "headline-sm": ["Plus Jakarta Sans"],
        "headline-xl": ["Plus Jakarta Sans"],
        "body-sm": ["Plus Jakarta Sans"],
        "body-md": ["Plus Jakarta Sans"],
        "headline-md": ["Plus Jakarta Sans"],
        "label-lg": ["Plus Jakarta Sans"],
        "body-lg": ["Plus Jakarta Sans"],
        "mono": ["JetBrains Mono", "monospace"]
      },
      fontSize: {
        "headline-lg": ["28px", { "lineHeight": "36px", "fontWeight": "600" }],
        "label-sm": ["11px", { "lineHeight": "14px", "fontWeight": "500" }],
        "headline-sm": ["18px", { "lineHeight": "24px", "fontWeight": "500" }],
        "headline-xl": ["36px", { "lineHeight": "44px", "fontWeight": "600" }],
        "body-sm": ["12px", { "lineHeight": "16px", "fontWeight": "400" }],
        "body-md": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "headline-md": ["22px", { "lineHeight": "28px", "fontWeight": "500" }],
        "label-lg": ["14px", { "lineHeight": "20px", "fontWeight": "500" }],
        "body-lg": ["16px", { "lineHeight": "24px", "fontWeight": "400" }]
      },
      animation: {
        'bounce-short': 'bounce-short 3s ease-in-out forwards',
      },
      keyframes: {
        'bounce-short': {
          '0%, 100%': { transform: 'translateY(100%)', opacity: 0 },
          '10%, 90%': { transform: 'translateY(0)', opacity: 1 },
        }
      }
    },
  },
  plugins: [],
}
