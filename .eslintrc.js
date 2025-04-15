/* eslint-env node */
module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "prettier"],
  plugins: ["@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      parserOptions: {
        project: ["./tsconfig.json"],
        projectService: true,
        tsconfigRootDir: __dirname,
      },
      extends: [
        "next/core-web-vitals",
        "plugin:@typescript-eslint/recommended",
      ],
    },
  ],
};
