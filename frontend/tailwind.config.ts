import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#000000",
          deep: "#0a0a1a",
        },
        glass: {
          surface: "rgba(255, 255, 255, 0.08)",
          border: "rgba(255, 255, 255, 0.15)",
          hover: "rgba(255, 255, 255, 0.12)",
        },
        ios: {
          blue: "#0A84FF",
          purple: "#BF5AF2",
          green: "#30D158",
          red: "#FF453A",
          yellow: "#FFD60A",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "ios-gradient": "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
      },
      borderRadius: {
        'ios-xl': '28px',
        'ios-lg': '24px',
        'ios-md': '20px',
        'ios-sm': '14px',
        'ios-xs': '12px',
      },
      backdropBlur: {
        'ios': '20px',
      },
    },
  },
  plugins: [],
};
export default config;
