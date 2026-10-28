import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 100,
  tabWidth: 2,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  sortPackageJson: {
    sortScripts: true,
  },
});
