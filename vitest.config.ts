import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src/", import.meta.url)),
  // Vitest has no Next font loader: the mock returns the shape `next/font/google` gives.
  "next/font/google": fileURLToPath(new URL("./src/test/mocks/next-font-google.ts", import.meta.url)),
  "server-only": fileURLToPath(new URL("./src/test/mocks/server-only.ts", import.meta.url)),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          include: ["src/test/lib/**/*.test.{ts,tsx}", "src/test/app/**/*.test.{ts,tsx}", "src/test/*.test.{ts,tsx}"],
          setupFiles: ["./src/test/setup.ts"],
        },
        resolve: { alias, conditions: ["react-server"] },
      },
      {
        extends: true,
        test: {
          name: "client",
          environment: "jsdom",
          // Testing Library registers its automatic `cleanup` only when `afterEach` is a global.
          globals: true,
          include: ["src/test/components/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
    ],
  },
});
