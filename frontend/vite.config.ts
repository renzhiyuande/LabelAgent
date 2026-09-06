import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const LOW_CODE_SRC = path.resolve(__dirname, "../packages/low-code-engine/src");

/** Resolve relative imports like `../../low-code/...` to the engine package source */
const LOW_CODE_RESOURCES = path.resolve(__dirname, "src/low-code-resources");

/** Resolve relative imports like `../../low-code/...` to the engine package source */
function lowCodeRelativeResolver(): import("vite").Plugin {
  return {
    name: "low-code-relative-resolver",
    resolveId(source, importer) {
      if (!importer || !source.startsWith(".")) return null;
      // Match any relative path ending in low-code/...
      // e.g. ../../low-code/utils/permissions → engine/src/utils/permissions
      //      ../../low-code/schema/resources/tasks → src/low-code-resources/tasks
      const match = source.match(/^(\.\.?\/)+(low-code)(\/.*)?$/);
      if (match) {
        let subPath = match[3] ?? "";
        // schema/resources/* moved to frontend/src/low-code-resources/
        if (subPath.startsWith("/schema/resources/")) {
          const resourceName = subPath.replace("/schema/resources/", "");
          return this.resolve(
            path.posix.join(LOW_CODE_RESOURCES, resourceName),
            importer,
            { skipSelf: true },
          );
        }
        return this.resolve(
          path.posix.join(LOW_CODE_SRC, subPath),
          importer,
          { skipSelf: true },
        );
      }
      return null;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const proxyTarget = env.VITE_PROXY_TARGET || "http://localhost:8080";

  return {
    root: __dirname,
    plugins: [react(), lowCodeRelativeResolver(), tailwindcss()],
    resolve: {
      dedupe: ["react", "react-dom", "react-router-dom"],
      alias: [
        { find: /^@labelhub\/low-code-engine$/, replacement: LOW_CODE_SRC },
        { find: /^@labelhub\/low-code-engine\//, replacement: path.posix.join(LOW_CODE_SRC, "/") },
        { find: /^@\/low-code$/, replacement: LOW_CODE_SRC },
        { find: /^@\/low-code\/(.*)/, replacement: path.posix.join(LOW_CODE_SRC, "$1") },
        { find: /^@\/(.*)/, replacement: path.posix.join(path.resolve(__dirname, "./src/"), "$1") },
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query", "@refinedev/core"],
            "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": proxyTarget,
        "/internal": proxyTarget,
      },
    },
  };
});
