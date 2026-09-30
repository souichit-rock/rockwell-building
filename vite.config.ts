import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    rollupOptions: {
      // The lazily loaded seed's module is src/data/seed/index.ts, which Rollup would name "index-*.js" like the entry.
      // Naming it keeps the gate's entry-chunk budget (dist/assets/index-*.js) measuring the entry alone.
      output: {
        chunkFileNames: (chunk) => (chunk.facadeModuleId?.includes("/src/data/seed/") ? "assets/seed-[hash].js" : "assets/[name]-[hash].js"),
        // Shared primitives, helpers and icons in one chunk: without this every lazy page pulled ~25 tiny
        // chunks (Button, Card, KV, each icon…) in a waterfall on a cold deep link (measured 2.4 s on Vercel).
        manualChunks: (id) => (/[\/]src[\/](components|lib)[\/]/.test(id) || id.includes("lucide-react") ? "ui" : undefined),
      },
    },
  },
  // `vite build --mode gate` bundles the seed integrity check as a node script (spec §9).
  ...(mode === "gate" && {
    build: {
      outDir: "dist-gate",
      emptyOutDir: true,
      ssr: "src/data/seed/check.entry.ts",
      rollupOptions: { output: { entryFileNames: "check.js" } },
    },
  }),
}));
