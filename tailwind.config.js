import daisyui from "daisyui";
import tw_elements_react from "tw-elements-react/dist/plugin.cjs";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.css",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/tw-elements-react/dist/js/**/*.js"
  ],
  theme: {
    extend: {
      gridTemplateColumns: {
        // Simple 16 column grid
        '25': 'repeat(25, minmax(0, 1fr))',
      },
      gridColumn: {
        'span-25': 'span 25 / span 25',
        'span-24': 'span 24 / span 25',
      }
    },
  },
  darkMode: "class",
  plugins: [daisyui, tw_elements_react],
  // daisyUI config (optional - here are the default values)
  daisyui: {
    themes: true, // true: all themes | false: only light + dark | array: specific themes like this ["light", "dark", "cupcake"]
    darkTheme: "dark", // name of one of the included themes for dark mode
    base: true, // applies background color and foreground color for root element by default
    styled: true, // include daisyUI colors and design decisions for all components
    utils: true, // adds responsive and modifier utility classes
    rtl: false, // rotate style direction from left-to-right to right-to-left. You also need to add dir="rtl" to your html tag and install `tailwindcss-flip` plugin for Tailwind CSS.
    prefix: "", // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
    logs: true, // Shows info about daisyUI version and used config in the console when building your CSS
  },
}