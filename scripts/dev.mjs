// Watches both builds into dist/ and writes dist/reload.json after each rebuild. The development
// background script polls that file and reloads the extension when it changes.
import { build } from "vite";
import { execSync } from "child_process";
import { rmSync, writeFileSync } from "fs";
import { resolve } from "path";

const dist = resolve("dist");
rmSync(dist, { recursive: true, force: true });

let firstBuilds = 0;
const stamp = () => writeFileSync(resolve(dist, "reload.json"), JSON.stringify({ t: Date.now() }));

for (const configFile of ["vite.config.ts", "vite.content.config.ts"]) {
    const watcher = await build({
        configFile,
        mode: "development",
        logLevel: "warn",
        build: { watch: {}, emptyOutDir: false, minify: false },
    });
    watcher.on("event", (e) => {
        if (e.code === "ERROR") console.error(e.error.message);
        if (e.code !== "END") return;
        stamp();
        if (firstBuilds < 2 && ++firstBuilds === 2) {
            try {
                execSync(`printf %s "${dist}" | pbcopy`);
            } catch {
                // Not on macOS, skip the clipboard.
            }
            console.log(`\nWatching. First time only: chrome://extensions > Developer mode > Load unpacked > ${dist}`);
            console.log("(Path copied to clipboard; press Cmd+Shift+G in the file picker to paste it.)");
            console.log("After that, saving a file rebuilds and reloads the extension. Refresh the page to pick up content script changes.\n");
        } else if (firstBuilds >= 2) {
            console.log(`Rebuilt ${configFile === "vite.config.ts" ? "popup/background" : "content script"}`);
        }
    });
}
