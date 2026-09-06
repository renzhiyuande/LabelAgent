import path from "node:path";
import { defineConfig } from "vitest/config";

const LOW_CODE_SRC = path.resolve(__dirname, "../packages/low-code-engine/src");

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@labelhub\/low-code-engine$/, replacement: LOW_CODE_SRC },
      { find: /^@labelhub\/low-code-engine\//, replacement: path.posix.join(LOW_CODE_SRC, "/") },
      { find: /^@\/low-code$/, replacement: LOW_CODE_SRC },
      { find: /^@\/low-code\/(.*)/, replacement: path.posix.join(LOW_CODE_SRC, "$1") },
      { find: /^@\/(.*)/, replacement: path.posix.join(path.resolve(__dirname, "./src/"), "$1") },
    ],
  },
  test: {
    environment: "jsdom",
  },
});
