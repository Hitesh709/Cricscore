import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { pitch: "#071b16", lime: "#c7f36b", paper: "#f5f7f3" }, boxShadow: { card: "0 10px 30px rgba(10,30,20,.07)" } } },
  plugins: [],
};
export default config;
