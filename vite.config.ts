import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";

export default defineConfig({
    plugins: [
        react(),
        viteStaticCopy({
            targets: [
                { src: "public/manifest.json", dest: "." },
                { src: "public/expand.png", dest: "." },
                { src: "public/background.js", dest: "." },
            ],
        }),
    ],
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, "index.html"),
                content: resolve(__dirname, "src/content.ts"),
            },
            output: {
                entryFileNames: "[name].js",
            },
        },
    },
});
