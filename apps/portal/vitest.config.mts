import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${root}$1` },
      // `server-only` throws outside a React Server environment; tests run in plain Node.
      { find: "server-only", replacement: `${root}test/server-only-stub.ts` },
    ],
  },
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", ".open-next/**"],
  },
});
