// Captures store screenshots and a demo clip from the built extension on a local demo article.
// Run `npm run build` first. Output goes to store-assets/.
import { chromium } from "playwright";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync } from "fs";
import { resolve } from "path";

const EXT = resolve("dist");
const OUT = resolve("store-assets");
const TMP = resolve(".pw-tmp/capture");
const VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm";
const EMBED = "https://www.youtube.com/embed/aqz-KE-bpKQ";
const W = 1280;
const H = 800;

const P1 =
    "The first warm week of spring is the best time to film in the garden. The light stays soft until mid morning, the wind drops, and the bees get to work on anything that has opened overnight.";
const P2 =
    "A short clip tells you more about how a plant moves than any photo can. Watch how the petals respond to a passing insect, then compare it with the same flower an hour later when the sun has moved on.";
const P3 =
    "You do not need much gear. A phone on a small tripod, a steady hand and a little patience will get you most of the way. Shoot more than you think you need, because the best moments are usually the ones you did not plan.";

const article = (media) => `<!doctype html><html><head><title>Filming your garden in spring</title><style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #faf8f4; color: #2b2a27; font: 18px/1.65 Georgia, serif; }
    header { padding: 18px 48px; border-bottom: 1px solid #e6e1d8; font: 600 17px system-ui, sans-serif; background: #fff; }
    main { width: 760px; margin: 0 auto; padding: 36px 0 900px; }
    h1 { font-size: 40px; line-height: 1.15; margin: 0 0 10px; }
    .by { font: 14px system-ui, sans-serif; color: #77736b; margin-bottom: 24px; }
    video, iframe { display: block; width: 760px; height: 428px; background: #111; border: 0; border-radius: 6px; }
    #cursor { position: fixed; left: 0; top: 0; width: 22px; height: 22px; margin: 0; padding: 0; border: 0;
        background: transparent; overflow: visible; pointer-events: none; inset: auto; }
</style></head><body>
    <header>Field Notes</header>
    <main>
        <h1>Filming your garden in spring</h1>
        <div class="by">6 minute read</div>
        ${media}
        <p>${P1}</p><p>${P2}</p><p>${P3}</p><p>${P1}</p><p>${P2}</p><p>${P3}</p><p>${P1}</p><p>${P2}</p>
    </main>
    <div id="cursor" popover="manual"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3l14 9-6 1.5L10 20z" fill="#111" stroke="#fff" stroke-width="1.5"/></svg></div>
    <script>
        const c = document.getElementById("cursor");
        c.showPopover();
        // Headless recordings have no cursor, so draw one above the top layer for the demo clip.
        addEventListener("pointermove", (e) => {
            c.style.left = e.clientX + "px";
            c.style.top = e.clientY + "px";
            c.hidePopover();
            c.showPopover();
        }, true);
        const v = document.querySelector("video");
        if (v) { v.muted = true; v.loop = true; v.play().catch(() => {}); }
    </script>
</body></html>`;

const VIDEO_PAGE = article(`<video id="m" src="${VIDEO}" playsinline></video>`);
const EMBED_PAGE = article(
    `<iframe id="m" src="${EMBED}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open({ windowed = false, windowW = W, windowH = H, ...extra } = {}) {
    const ctx = await chromium.launchPersistentContext(resolve(TMP, `profile-${Date.now()}`), {
        channel: "chromium",
        headless: true,
        viewport: windowed ? null : { width: W, height: H },
        ...(windowed ? {} : { deviceScaleFactor: 2 }),
        args: [
            `--disable-extensions-except=${EXT}`,
            `--load-extension=${EXT}`,
            "--autoplay-policy=no-user-gesture-required",
            ...(windowed ? [`--window-size=${windowW},${windowH}`] : []),
        ],
        ...extra,
    });
    const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker"));
    await ctx.route("https://demo.test/video", (r) => r.fulfill({ contentType: "text/html", body: VIDEO_PAGE }));
    await ctx.route("https://demo.test/embed", (r) => r.fulfill({ contentType: "text/html", body: EMBED_PAGE }));
    await sleep(800);
    // A fresh page gets the full viewport in recordings; the startup tabs don't.
    const page = await ctx.newPage();
    for (const p of ctx.pages()) if (p !== page) await p.close();
    if (!windowed) await page.setViewportSize({ width: W, height: H });
    return { ctx, page, sw, id: sw.url().split("/")[2] };
}

async function glide(page, x, y, steps = 18) {
    await page.mouse.move(x, y, { steps });
    await sleep(120);
}

const rectOf = (page) =>
    page.evaluate(() => {
        const r = document.getElementById("m").getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
    });

// Toolbar buttons are 30px wide with a 2px gap, inside a pill 8px from the media's right edge.
const popOutX = (r, buttons) => r.x + r.w - 8 - 3 - 15 - (buttons - 1) * 32;
const toolbarY = (r) => r.y + 8 + 3 + 14;

async function screenshots() {
    const { ctx, page, sw, id } = await open();

    await page.goto("https://demo.test/video");
    await sleep(1800);
    let r = await rectOf(page);
    await page.mouse.move(r.x + 300, r.y + 200);
    await glide(page, r.x + r.w - 150, r.y + 120);
    await sleep(300);
    await page.screenshot({ path: resolve(OUT, "raw-1-toolbar.png") });

    // Three buttons here: pop out, PiP, download (this demo video is a regular file).
    await glide(page, popOutX(r, 3), toolbarY(r), 6);
    await page.mouse.down();
    await page.mouse.up();
    await sleep(700);
    await page.mouse.wheel(0, 620);
    await sleep(500);
    // Shrink from the top-left corner into a corner-of-the-screen player, then settle it.
    r = await rectOf(page);
    await page.mouse.move(r.x + 2, r.y - 28 + 2);
    await page.mouse.down();
    await page.mouse.move(r.x + 250, r.y - 26 + 140, { steps: 12 });
    await page.mouse.up();
    await sleep(200);
    r = await rectOf(page);
    await page.mouse.move(r.x + r.w / 2, r.y + r.h / 2);
    await page.mouse.down();
    await page.mouse.move(W - 16 - r.w / 2, H - 16 - r.h / 2, { steps: 12 });
    await page.mouse.up();
    await sleep(400);
    await page.mouse.move(r.x + r.w / 2 + 40, r.y + r.h / 2);
    await sleep(300);
    await page.screenshot({ path: resolve(OUT, "raw-2-floating.png") });

    await page.goto("https://demo.test/embed");
    await sleep(6000);
    r = await rectOf(page);
    await page.mouse.move(r.x + 300, r.y + 200);
    await glide(page, r.x + r.w - 120, r.y + 80);
    await sleep(300);
    await glide(page, popOutX(r, 1), toolbarY(r), 6);
    await page.mouse.down();
    await page.mouse.up();
    await sleep(1500);
    await page.mouse.wheel(0, 500);
    await sleep(500);
    await page.mouse.move(40, 400);
    await sleep(400);
    await page.screenshot({ path: resolve(OUT, "raw-3-embed.png") });

    // The guide's left and right toolbar comparison, on a small video so the icons read clearly.
    await page.goto("https://demo.test/video");
    await page.addStyleTag({ content: "#m { width: 360px !important; height: 203px !important; } #cursor { display: none !important; }" });
    await sleep(1500);
    r = await rectOf(page);
    const crop = { x: r.x, y: r.y, width: r.w, height: r.h };
    for (const toolbarSide of ["right", "left"]) {
        await sw.evaluate((value) => chrome.storage.sync.set({ toolbarSide: value }), toolbarSide);
        await sleep(200);
        await page.mouse.move(r.x + 150, r.y + 120);
        await glide(page, r.x + 180, r.y + 130, 6);
        await sleep(300);
        await page.screenshot({ path: resolve(`public/assets/toolbar-${toolbarSide}.jpg`), type: "jpeg", quality: 85, clip: crop });
    }
    await sw.evaluate(() => chrome.storage.sync.set({ toolbarSide: "right" }));

    for (const scheme of ["light", "dark"]) {
        await page.setViewportSize({ width: 292, height: 560 });
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(`chrome-extension://${id}/index.html`);
        await sleep(600);
        await page.locator(".popup-container").screenshot({ path: resolve(OUT, `raw-4-popup-${scheme}.png`) });
    }
    await ctx.close();
}

async function demoClip() {
    const dir = resolve(TMP, "video");
    // Screencasts only paint the real window, minus 140px of hidden browser toolbar, so an emulated
    // viewport leaves a gray band. Use the window's own size instead.
    const clipH = H - 140;
    const { ctx, page } = await open({ windowed: true, recordVideo: { dir, size: { width: W, height: clipH } } });
    await page.goto("https://demo.test/video");
    await sleep(1500);
    let r = await rectOf(page);
    await page.mouse.move(r.x + 200, r.y + 300);
    await glide(page, r.x + r.w - 180, r.y + 110, 30);
    await sleep(900);
    await glide(page, popOutX(r, 3), toolbarY(r), 14);
    await sleep(400);
    await page.mouse.down();
    await page.mouse.up();
    await sleep(1000);

    r = await rectOf(page);
    await glide(page, r.x + 1, r.y - 27, 24);
    await page.mouse.down();
    await page.mouse.move(r.x + 250, r.y - 26 + 140, { steps: 40 });
    await page.mouse.up();
    await sleep(500);

    r = await rectOf(page);
    await glide(page, r.x + r.w / 2, r.y + r.h / 2, 16);
    await page.mouse.down();
    await page.mouse.move(W - 16 - r.w / 2, clipH - 16 - r.h / 2, { steps: 36 });
    await page.mouse.up();
    await sleep(700);

    for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 70);
        await sleep(110);
    }
    await sleep(1600);
    const file = await page.video().path();
    await ctx.close();
    renameSync(file, resolve(OUT, "demo.webm"));
}

// A closer crop for the guide's drag and resize step.
async function resizeClip() {
    const dir = resolve(TMP, "video-resize");
    const cw = 860;
    const ch = 480;
    const { ctx, page, sw } = await open({
        windowed: true,
        windowW: cw,
        windowH: ch + 140,
        recordVideo: { dir, size: { width: cw, height: ch } },
    });
    await page.goto("https://demo.test/video");
    await sleep(1500);
    await sw.evaluate(async () => {
        for (const t of await chrome.tabs.query({})) chrome.tabs.sendMessage(t.id, { type: "POP_OUT_BEST" }, { frameId: 0 }).catch(() => {});
    });
    await sleep(900);

    let r = await rectOf(page);
    await page.mouse.move(r.x + r.w - 60, r.y + r.h - 60);
    await glide(page, r.x + r.w - 3, r.y + r.h - 3, 14);
    await sleep(250);
    await page.mouse.down();
    await page.mouse.move(r.x + 360, r.y + 203, { steps: 34 });
    await page.mouse.up();
    await sleep(500);

    r = await rectOf(page);
    await glide(page, r.x + r.w / 2, r.y + r.h / 2, 14);
    await page.mouse.down();
    await page.mouse.move(cw - 16 - r.w / 2, ch - 16 - r.h / 2, { steps: 34 });
    await page.mouse.up();
    await sleep(500);

    r = await rectOf(page);
    await glide(page, r.x + 1, r.y - 27, 16);
    await sleep(250);
    await page.mouse.down();
    await page.mouse.move(r.x - 130, r.y - 27 - 73, { steps: 28 });
    await page.mouse.up();
    await sleep(1200);
    const file = await page.video().path();
    await ctx.close();
    renameSync(file, resolve(OUT, "resize.webm"));
}

const SLIDES = [
    { file: "raw-1-toolbar.png", title: "Hover any video. Pop it out in one click.", zoom: true },
    { file: "raw-2-floating.png", title: "Keep watching while you scroll." },
    { file: "raw-3-embed.png", title: "Works on embedded players too, without reloading them." },
    { file: "raw-1-toolbar.png", title: "Simple settings, in light or dark.", popup: true },
];

const dataUrl = (name) => `data:image/png;base64,${readFileSync(resolve(OUT, name)).toString("base64")}`;

// Store slides: a headline over the real capture, sized exactly 1280x800.
async function slides() {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    for (const [i, s] of SLIDES.entries()) {
        await page.setContent(`<!doctype html><body style="margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#111827;position:relative">
            <div style="height:120px;display:flex;align-items:center;justify-content:center;color:#fff;font:600 36px system-ui,sans-serif">${s.title}</div>
            <div style="position:absolute;left:96px;top:120px;width:1088px;height:680px;border-radius:12px 12px 0 0;overflow:hidden">
                <img src="${dataUrl(s.file)}" style="position:absolute;display:block;${s.zoom ? "left:-544px;top:-304px;width:2048px" : "left:0;top:0;width:1088px"}">
            </div>
            ${s.popup ? `<img src="${dataUrl("raw-4-popup-light.png")}" style="position:absolute;right:130px;top:128px;width:292px;border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.45)">` : ""}
        </body>`);
        await sleep(200);
        await page.screenshot({ path: resolve(OUT, `store-${i + 1}.png`) });
    }
    // Promo tile: the only image shown in store search and category grids.
    await page.setViewportSize({ width: 440, height: 280 });
    const icon = `data:image/png;base64,${readFileSync(resolve("public/assets/icon-128.png")).toString("base64")}`;
    await page.setContent(`<!doctype html><body style="margin:0;width:440px;height:280px;overflow:hidden;background:#111827;color:#fff;font-family:system-ui,sans-serif;position:relative">
        <div style="position:absolute;left:28px;top:30px;width:46px;height:46px;background:#fff;border-radius:11px;display:flex;align-items:center;justify-content:center"><img src="${icon}" style="width:32px;height:32px"></div>
        <div style="position:absolute;left:28px;top:92px;width:384px;font-weight:700;font-size:37px;line-height:1.1">Draggable Video<br>Pop Out</div>
        <div style="position:absolute;left:28px;top:186px;width:384px;font-size:20px;line-height:1.3;color:#cbd5e1">Floating, resizable and picture in picture, for any video</div>
    </body>`);
    await sleep(200);
    await page.screenshot({ path: resolve(OUT, "promo-tile-440x280.png") });
    await browser.close();
}

const only = process.argv[2];
rmSync(TMP, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
if (only !== "slides") {
    await screenshots();
    await demoClip();
    await resizeClip();
}
await slides();
for (const clip of ["demo.webm", "resize.webm"]) copyFileSync(resolve(OUT, clip), resolve("public/assets", clip));
console.log(readdirSync(OUT).join("\n"));
