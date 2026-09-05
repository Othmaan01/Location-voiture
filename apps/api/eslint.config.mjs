import base from "@lv/config/eslint.base.mjs";

export default [
  ...base,
  {
    rules: {
      // Les plugins Fastify sont declares async par convention, meme sans await.
      "@typescript-eslint/require-await": "off",
    },
  },
];
