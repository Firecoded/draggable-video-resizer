import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    publicDir: false,
    build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, "src/content/index.ts"),
            formats: ["iife"],
            name: "draggableVideoResizer",
            fileName: () => "content.js",
        },
    },
});
