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
                { src: "public/js/background.js", dest: "." },
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
                content: resolve(__dirname, "src/content.ts"),
            },
            output: {
                entryFileNames: "[name].js",
            },
        },
    },
});
