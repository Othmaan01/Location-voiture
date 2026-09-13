import base from "@lv/config/eslint.base.mjs";

export default [
  ...base,
  {
    rules: {
      // Les plugins Fastify sont declares async par convention, meme sans await.
      "@typescript-eslint/require-await": "off",
    },
  },
  {
    // Scripts d'outillage (compilation de l'image) : JavaScript hors du projet TypeScript.
    files: ["scripts/**/*.mjs"],
    languageOptions: { parserOptions: { projectService: false, project: null } },
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
];
