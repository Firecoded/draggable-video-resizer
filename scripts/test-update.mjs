// Simulates real extension updates: change the version on disk and reload in one browser session,
// which fires onInstalled with reason "update" and a real previousVersion.
import { chromium } from "playwright";
import { cpSync, rmSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const TMP = resolve(".pw-tmp/update");
const EXT = resolve(TMP, "ext");
rmSync(TMP, { recursive: true, force: true });
cpSync(resolve("dist"), EXT, { recursive: true });

function setVersion(version) {
    const path = resolve(EXT, "manifest.json");
    writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, "utf8")), version }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
setVersion("1.3");
const ctx = await chromium.launchPersistentContext(resolve(TMP, "profile"), {
    channel: "chromium",
    headless: true,
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
if (!ctx.serviceWorkers().length) await ctx.waitForEvent("serviceworker");
await sleep(1500);

const urls = () => ctx.pages().map((p) => p.url().replace(/^chrome-extension:\/\/[^/]+/, ""));
const out = [{ version: "1.3", urls: urls() }];
for (const version of ["2.0", "2.0.1"]) {
    setVersion(version);
    const next = ctx.waitForEvent("serviceworker");
    ctx.serviceWorkers().at(-1).evaluate(() => chrome.runtime.reload()).catch(() => {});
    await next;
    await sleep(2000);
    out.push({ version, urls: urls() });
    const updated = ctx.pages().find((p) => p.url().includes("updated=true"));
    if (updated && version === "2.0") await updated.screenshot({ path: resolve(TMP, "guide-updated.png") });
}
console.log(JSON.stringify(out, null, 1));
await ctx.close();
