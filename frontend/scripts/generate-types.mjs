import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const out = resolve("src/generated/openapi-types.ts");
await mkdir(dirname(out), { recursive: true });
await writeFile(
  out,
  `// Generated placeholder. Replace with openapi-typescript once backend and agent docs are published in CI.
export type BackendOpenApi = Record<string, unknown>;
export type AgentOpenApi = Record<string, unknown>;
`,
);
console.log(`Generated ${out}`);

