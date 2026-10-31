import { buildControls } from "./controls";
import { notifyFramePopped } from "./frames";
import type { Media } from "./detect";
import { icons } from "./icons";
import { isDark, onSettingsChange } from "./state";

export const UI_ATTR = "data-dvr-ui";

const BAR = 28;
const MARGIN = 16;
const SNAP = 24;
const MIN_W = 200;
const CASCADE = 28;

interface Geom {
    x: number;
    y: number;
    w: number;
    // Height of the media area; the window is BAR taller.
    h: number;
}

interface FloatingWindow {
    media: Media;
    clampAndApply(): void;
    afterFullscreenChange(): void;
    close(): void;
}

const windows = new Map<Media, FloatingWindow>();
let nextId = 1;

export function isOurUi(el: Element): boolean {
    return el.hasAttribute(UI_ATTR);
}

export function isPopped(media: Media): boolean {
    return windows.has(media);
}

export function lastPopped(): Media | undefined {
    return Array.from(windows.keys()).pop();
}

export function putBack(media: Media) {
    windows.get(media)?.close();
}

// The popup asks for a review once someone has used this a few times.
function countPopOut() {
    chrome.storage.local.get({ popOutCount: 0 }, (res) => {
        chrome.storage.local.set({ popOutCount: (res.popOutCount as number) + 1 });
    });
}

export function initFloatingWindows() {
    addEventListener("resize", () => windows.forEach((w) => w.clampAndApply()));
    document.addEventListener("fullscreenchange", () => windows.forEach((w) => w.afterFullscreenChange()));
}

// Open where the video already is, at its size, scaled down only as far as needed for the
// window (title bar included) to fit on screen with a margin. Fullscreen-sized players come out
// slightly smaller so the whole window is visible.
function initialGeom(rect: DOMRect, ratio: number, cascade: number): Geom {
    const maxW = Math.min(innerWidth - MARGIN * 2, innerWidth * 0.92);
    const maxH = Math.min(innerHeight - MARGIN * 2, innerHeight * 0.92) - BAR;
    let w = Math.max(rect.width, MIN_W);
    let h = w / ratio;
    if (w > maxW) {
        w = maxW;
        h = w / ratio;
    }
    if (h > maxH) {
        h = maxH;
        w = h * ratio;
    }
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return { x: cx - w / 2 + cascade * CASCADE, y: cy - (h + BAR) / 2 + cascade * CASCADE, w, h };
}

function clampGeom(g: Geom, ratio: number) {
    const maxW = innerWidth - 8;
    const maxH = innerHeight - BAR - 8;
    if (g.w > maxW) {
        g.w = maxW;
        g.h = g.w / ratio;
    }
    if (g.h > maxH) {
        g.h = maxH;
        g.w = g.h * ratio;
    }
    g.x = Math.min(Math.max(0, g.x), innerWidth - g.w);
    g.y = Math.min(Math.max(0, g.y), innerHeight - g.h - BAR);
}

function snapGeom(g: Geom) {
    if (g.x < SNAP + MARGIN) g.x = MARGIN;
    if (innerWidth - g.x - g.w < SNAP + MARGIN) g.x = innerWidth - g.w - MARGIN;
    if (g.y < SNAP + MARGIN) g.y = MARGIN;
    if (innerHeight - g.y - g.h - BAR < SNAP + MARGIN) g.y = innerHeight - g.h - BAR - MARGIN;
}

// The media and our frame both live in the top layer, so no ancestor's overflow, transform or
// z-index can clip them. These rules beat the site's own (non-important inline) styles, which
// players like YouTube keep rewriting.
const RESET = `
    margin: 0 !important; padding: 0 !important; border: 0 !important; inset: auto !important;
    position: fixed !important; max-width: none !important; max-height: none !important;
    min-width: 0 !important; min-height: 0 !important; transform: none !important;
    translate: none !important; scale: none !important; rotate: none !important;
    opacity: 1 !important; visibility: visible !important; display: block !important;
    clip-path: none !important; filter: none !important; box-shadow: none !important;`;

function createStyle(id: number) {
    const style = document.createElement("style");
    style.setAttribute(UI_ATTR, "");
    style.textContent = `
        :is(video, iframe)[data-dvr-popped="${id}"]:popover-open {${RESET}
            background: #000 !important; object-fit: contain !important; overflow: hidden !important;
            border-radius: 0 0 10px 10px !important;
        }
        [data-dvr-frame="${id}"]:popover-open {${RESET}
            background: transparent !important; overflow: visible !important; pointer-events: none !important;
        }`;
    (document.head ?? document.documentElement).appendChild(style);
    const rules = style.sheet!.cssRules;
    return { style, media: (rules[0] as CSSStyleRule).style, frame: (rules[1] as CSSStyleRule).style };
}

const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

const FRAME_CSS = `
    .win { all: initial; position: absolute; inset: 0; display: block; pointer-events: none;
        font: 12px/1.2 system-ui, sans-serif;
        --bar-bg: #f3f4f6; --bar-fg: #111827; --muted: #6b7280; --ring: rgba(0,0,0,.14);
        --ctl-bg: rgba(255,255,255,.92); --ctl-fg: #111827; --accent: #2563eb; }
    :host([data-theme="dark"]) .win { --bar-bg: #1f2937; --bar-fg: #f3f4f6; --muted: #9ca3af;
        --ring: rgba(255,255,255,.14); --ctl-bg: rgba(17,24,39,.88); --ctl-fg: #e5e7eb; --accent: #60a5fa; }
    .shell { position: absolute; inset: 0; border-radius: 10px; pointer-events: none;
        box-shadow: 0 12px 32px rgba(0,0,0,.35), 0 0 0 1px var(--ring); }
    .bar { position: absolute; left: 0; right: 0; top: 0; height: ${BAR}px; display: flex; align-items: center;
        gap: 6px; padding: 0 4px 0 6px; box-sizing: border-box; background: var(--bar-bg); color: var(--bar-fg);
        border-radius: 10px 10px 0 0; cursor: move; pointer-events: auto; user-select: none; }
    .grip { display: flex; color: var(--muted); }
    .grip svg { width: 14px; height: 14px; }
    .title { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--muted); }
    button { all: unset; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;
        border-radius: 6px; cursor: pointer; color: inherit; }
    button:hover { background: var(--ring); }
    button:focus-visible { outline: 2px solid var(--accent); }
    button svg { width: 16px; height: 16px; }
    .close:hover { color: #ef4444; }
    .body { position: absolute; left: 0; right: 0; top: ${BAR}px; bottom: 0; pointer-events: auto; cursor: move; }
    .body.passthrough { pointer-events: none; }
    .win.idle .body { cursor: none; }
    .h { position: absolute; pointer-events: auto; z-index: 2; }
    .n, .s { left: 10px; right: 10px; height: 8px; cursor: ns-resize; }
    .e, .w { top: 10px; bottom: 10px; width: 8px; cursor: ew-resize; }
    .n { top: -4px; } .s { bottom: -4px; } .e { right: -4px; } .w { left: -4px; }
    .ne, .nw, .se, .sw { width: 16px; height: 16px; }
    .ne { top: -5px; right: -5px; cursor: nesw-resize; } .sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
    .nw { top: -5px; left: -5px; cursor: nwse-resize; } .se { bottom: -5px; right: -5px; cursor: nwse-resize; }`;

export function popOut(media: Media) {
    if (windows.has(media) || !media.isConnected) return;
    const cascade = windows.size;
    const isVideo = media instanceof HTMLVideoElement;
    const rect = media.getBoundingClientRect();
    const rawRatio = isVideo && media.videoWidth ? media.videoWidth / media.videoHeight : rect.width / rect.height;
    const ratio = Number.isFinite(rawRatio) && rawRatio > 0 ? Math.min(4, Math.max(0.3, rawRatio)) : 16 / 9;
    const id = nextId++;
    const g = initialGeom(rect, ratio, cascade);
    clampGeom(g, ratio);

    const placeholder = createPlaceholder(media, rect, () => close());
    const prevPopover = media.getAttribute("popover");
    const prevControls = isVideo ? media.controls : false;
    const rules = createStyle(id);

    media.setAttribute("data-dvr-popped", String(id));
    media.setAttribute("popover", "manual");
    try {
        media.showPopover();
    } catch (err) {
        console.warn("[Draggable Video Pop Out] Couldn't pop out this element:", err);
        restoreMedia();
        placeholder.remove();
        rules.style.remove();
        return;
    }
    if (isVideo) media.controls = false;

    const host = document.createElement("div");
    host.setAttribute(UI_ATTR, "");
    host.setAttribute("data-dvr-frame", String(id));
    host.setAttribute("popover", "manual");
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<style>${FRAME_CSS}</style>
        <div class="win">
            <div class="shell"></div>
            <div class="bar">
                <span class="grip">${icons.grip}</span>
                <span class="title"></span>
                ${isVideo ? "" : `<button class="fs" title="Fullscreen" aria-label="Fullscreen">${icons.fullscreen}</button>`}
                <button class="close" title="Put back" aria-label="Put back">${icons.close}</button>
            </div>
            <div class="body${isVideo ? "" : " passthrough"}"></div>
            ${HANDLES.map((d) => `<div class="h ${d}" data-dir="${d}"></div>`).join("")}
        </div>`;
    const win = root.querySelector<HTMLElement>(".win")!;
    const bar = root.querySelector<HTMLElement>(".bar")!;
    const body = root.querySelector<HTMLElement>(".body")!;
    root.querySelector<HTMLElement>(".title")!.textContent = document.title || location.hostname;
    root.querySelector<HTMLElement>(".close")!.onclick = () => close();
    const fsBtn = root.querySelector<HTMLElement>(".fs");
    if (fsBtn) fsBtn.onclick = () => media.requestFullscreen().catch(() => {});

    const originalInView = () => {
        const r = placeholder.getBoundingClientRect();
        return placeholder.isConnected && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    };
    const controls = isVideo ? buildControls(media, win, originalInView) : null;

    const applyTheme = () => host.setAttribute("data-theme", isDark() ? "dark" : "light");
    applyTheme();
    const offSettings = onSettingsChange(applyTheme);

    document.documentElement.appendChild(host);
    host.showPopover();

    function apply() {
        rules.frame.setProperty("left", `${g.x}px`, "important");
        rules.frame.setProperty("top", `${g.y}px`, "important");
        rules.frame.setProperty("width", `${g.w}px`, "important");
        rules.frame.setProperty("height", `${g.h + BAR}px`, "important");
        rules.media.setProperty("left", `${g.x}px`, "important");
        rules.media.setProperty("top", `${g.y + BAR}px`, "important");
        rules.media.setProperty("width", `${g.w}px`, "important");
        rules.media.setProperty("height", `${g.h}px`, "important");
    }
    apply();

    function drag(e: PointerEvent, target: HTMLElement, onClick?: () => void) {
        if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
        e.preventDefault();
        const sx = e.clientX;
        const sy = e.clientY;
        const ox = g.x;
        const oy = g.y;
        let moved = false;
        target.setPointerCapture(e.pointerId);
        const move = (ev: PointerEvent) => {
            const dx = ev.clientX - sx;
            const dy = ev.clientY - sy;
            if (!moved && Math.hypot(dx, dy) < 4) return;
            moved = true;
            g.x = ox + dx;
            g.y = oy + dy;
            clampGeom(g, ratio);
            apply();
        };
        const up = () => {
            target.removeEventListener("pointermove", move);
            target.removeEventListener("pointerup", up);
            target.removeEventListener("pointercancel", up);
            if (moved) {
                snapGeom(g);
                apply();
            } else {
                onClick?.();
            }
        };
        target.addEventListener("pointermove", move);
        target.addEventListener("pointerup", up);
        target.addEventListener("pointercancel", up);
    }

    function resize(e: PointerEvent, handle: HTMLElement) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const dir = handle.dataset.dir!;
        const s = { ...g };
        const sx = e.clientX;
        const sy = e.clientY;
        handle.setPointerCapture(e.pointerId);
        const move = (ev: PointerEvent) => {
            const dx = ev.clientX - sx;
            const dy = ev.clientY - sy;
            const lock = !ev.shiftKey;
            const vertical = dir === "n" || dir === "s";
            let w = s.w + (dir.includes("e") ? dx : dir.includes("w") ? -dx : 0);
            let h = s.h + (dir.includes("s") ? dy : dir.includes("n") ? -dy : 0);
            if (lock) {
                if (vertical) w = h * ratio;
                else h = w / ratio;
            }
            w = Math.min(Math.max(MIN_W, w), innerWidth - 8);
            if (lock) h = w / ratio;
            h = Math.min(Math.max(MIN_W / 4, h), innerHeight - BAR - 8);
            if (lock) w = h * ratio;
            g.w = w;
            g.h = h;
            g.x = dir.includes("w") ? s.x + s.w - w : s.x;
            g.y = dir.includes("n") ? s.y + s.h - h : s.y;
            g.x = Math.min(Math.max(0, g.x), innerWidth - g.w);
            g.y = Math.min(Math.max(0, g.y), innerHeight - g.h - BAR);
            apply();
        };
        const up = () => {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", up);
            handle.removeEventListener("pointercancel", up);
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", up);
        handle.addEventListener("pointercancel", up);
    }

    bar.addEventListener("pointerdown", (e) => drag(e, bar));
    if (isVideo) {
        body.addEventListener("pointerdown", (e) => drag(e, body, () => controls?.togglePlay()));
        body.addEventListener("dblclick", () => media.requestFullscreen().catch(() => {}));
    }
    root.querySelectorAll<HTMLElement>(".h").forEach((h) => h.addEventListener("pointerdown", (e) => resize(e, h)));

    // The site may remove the element (SPA navigation, feed recycling). Anything else, like
    // YouTube loading the next video into the same element, keeps the window open.
    const watcher = setInterval(() => {
        if (!media.isConnected) close();
        else if (!document.fullscreenElement && !media.matches(":popover-open")) reshow();
    }, 1000);

    function reshow() {
        try {
            if (!media.matches(":popover-open")) media.showPopover();
            host.hidePopover();
            host.showPopover();
        } catch {
            close();
        }
    }

    function restoreMedia() {
        if (media.matches(":popover-open")) media.hidePopover();
        media.removeAttribute("data-dvr-popped");
        if (prevPopover === null) media.removeAttribute("popover");
        else media.setAttribute("popover", prevPopover);
    }

    function notifyFrame(popped: boolean) {
        if (!isVideo) notifyFramePopped(media as HTMLIFrameElement, popped);
    }
    notifyFrame(true);

    function close() {
        if (!windows.has(media)) return;
        windows.delete(media);
        clearInterval(watcher);
        offSettings();
        controls?.destroy();
        if (media.isConnected) {
            restoreMedia();
            if (isVideo) media.controls = prevControls;
        }
        host.remove();
        placeholder.remove();
        rules.style.remove();
        notifyFrame(false);
    }

    countPopOut();

    windows.set(media, {
        media,
        close,
        clampAndApply() {
            clampGeom(g, ratio);
            apply();
        },
        afterFullscreenChange() {
            const isFull = document.fullscreenElement === media;
            if (isVideo) media.controls = isFull || false;
            if (!isFull && !document.fullscreenElement) reshow();
        },
    });
}

function createPlaceholder(media: Media, rect: DOMRect, onPutBack: () => void): HTMLElement {
    const cs = getComputedStyle(media);
    const ph = document.createElement("div");
    ph.setAttribute(UI_ATTR, "");
    const positioned = cs.position === "absolute" || cs.position === "fixed";
    Object.assign(ph.style, {
        display: cs.display === "inline" ? "inline-block" : cs.display === "none" ? "block" : cs.display,
        boxSizing: "border-box",
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: cs.margin,
        flex: cs.flex,
        position: positioned ? "absolute" : "relative",
        top: positioned ? cs.top : "",
        left: positioned ? cs.left : "",
        verticalAlign: "top",
    });
    const root = ph.attachShadow({ mode: "closed" });
    const roomy = rect.height >= 90 && rect.width >= 220;
    root.innerHTML = `<style>
        .ph { all: initial; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
            gap: 10px; background: #0b0b0b; color: #a3a3a3; font: 13px/1.3 system-ui, sans-serif; border-radius: 8px; }
        button { all: unset; cursor: pointer; padding: 6px 12px; border-radius: 999px; background: #262626; color: #f5f5f5; }
        button:hover { background: #404040; }
        button:focus-visible { outline: 2px solid #60a5fa; }
    </style>
    <div class="ph">${roomy ? "<span>Playing in a floating window</span>" : ""}<button>Put back</button></div>`;
    root.querySelector("button")!.onclick = onPutBack;
    media.before(ph);
    return ph;
}
