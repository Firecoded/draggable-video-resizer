import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";

// The content script is built separately (vite.content.config.ts) as an IIFE, because Chrome
// can't load content scripts as ES modules and shared chunks would add import statements.
export default defineConfig({
    plugins: [
        react(),
        viteStaticCopy({
            targets: [
                { src: "public/manifest.json", dest: "." },
                { src: "public/assets/icon-16.png", dest: "." },
                { src: "public/assets/icon-48.png", dest: "." },
                { src: "public/assets/icon-128.png", dest: "." },
            ],
        }),
    ],
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: resolve(__dirname, "index.html"),
                permission: resolve(__dirname, "permission.html"),
                background: resolve(__dirname, "src/background.ts"),
            },
            output: {
                entryFileNames: "[name].js",
            },
        },
    },
});
