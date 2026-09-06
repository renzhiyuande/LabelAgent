import { defineConfig } from "tsup";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: [resolve(__dirname, "src/index.ts")],
  outDir: resolve(__dirname, "dist"),
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: false,
  external: [
    "react",
    "react-dom",
    "react-router-dom",
    "@refinedev/core",
    "@tanstack/react-query",
    "@radix-ui/react-avatar",
    "@radix-ui/react-checkbox",
    "@radix-ui/react-context-menu",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-hover-card",
    "@radix-ui/react-label",
    "@radix-ui/react-menubar",
    "@radix-ui/react-popover",
    "@radix-ui/react-radio-group",
    "@radix-ui/react-select",
    "@radix-ui/react-slot",
    "@radix-ui/react-switch",
    "@radix-ui/react-tabs",
    "@radix-ui/react-tooltip",
    "cmdk",
    "react-day-picker",
  ],
  tsconfig: resolve(__dirname, "./tsconfig.json"),
});
