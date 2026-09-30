import next from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...next,
  ...nextTs,
  { rules: { "react/no-unescaped-entities": "off" } },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];
export default config;
