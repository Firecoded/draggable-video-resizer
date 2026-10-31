import { embedVideo, fillsFrame, isBigEnough, isHoverPreview, isTopFrame, videoAt } from "./detect";
import { downloadUrl, downloadVideo } from "./download";
import { isOurUi, isPopped, popOut, UI_ATTR } from "./floatingWindow";
import { requestFramePopOut } from "./frames";
import { icons } from "./icons";
import { canPip, togglePip } from "./pip";
import { onSettingsChange, state, toolbarAllowedHere } from "./state";

const CHECK_MS = 80;
const HIDE_DELAY_MS = 400;
const IDLE_HIDE_MS = 2000;

const CSS = `
    .pill { all: initial; position: fixed; display: none; gap: 2px; padding: 3px; border-radius: 999px;
        background: rgba(17,17,17,.85); color: #f5f5f5; font: 12px/1 system-ui, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,.3); pointer-events: auto; z-index: 2147483647; }
    .pill.show { display: flex; }
    button { all: unset; display: flex; align-items: center; justify-content: center; width: 30px; height: 28px;
        border-radius: 999px; cursor: pointer; color: inherit; white-space: nowrap; }
    button:hover { background: rgba(255,255,255,.16); }
    button:focus-visible { outline: 2px solid #60a5fa; }
    button svg { width: 17px; height: 17px; }`;

let host: HTMLElement | null = null;
let pill: HTMLElement;
let target: HTMLVideoElement | null = null;
let lastX = -1;
let lastY = -1;
let checkTimer = 0;
let hideTimer = 0;
let idleTimer = 0;
let enabled = false;

export function hoveredVideo(): HTMLVideoElement | null {
    return target;
}

export function initToolbar() {
    sync();
    onSettingsChange(sync);
}

function sync() {
    position();
    const want = toolbarAllowedHere();
    if (want === enabled) return;
    enabled = want;
    if (enabled) attach();
    else detach();
}

function attach() {
    if (!host) {
        host = document.createElement("div");
        host.setAttribute(UI_ATTR, "");
        // Keeps clicks on the pill from reaching the site's own player handlers.
        for (const ev of ["pointerdown", "mousedown", "click", "dblclick", "pointerup", "mouseup"]) {
            host.addEventListener(ev, (e) => e.stopPropagation());
        }
        const root = host.attachShadow({ mode: "closed" });
        root.innerHTML = `<style>${CSS}</style><div class="pill" role="toolbar" aria-label="Video tools"></div>`;
        pill = root.querySelector(".pill")!;
    }
    document.documentElement.appendChild(host);
    document.addEventListener("pointermove", onPointerMove, { capture: true, passive: true });
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.documentElement.addEventListener("pointerleave", scheduleHide);
}

function detach() {
    document.removeEventListener("pointermove", onPointerMove, { capture: true });
    document.removeEventListener("scroll", onScroll, { capture: true });
    document.documentElement.removeEventListener("pointerleave", scheduleHide);
    hide();
    host?.remove();
}

function onPointerMove(e: PointerEvent) {
    lastX = e.clientX;
    lastY = e.clientY;
    // Fade out when the mouse rests, like player controls, so it doesn't sit over the video.
    clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
        if (!host?.matches(":hover")) hide();
    }, IDLE_HIDE_MS);
    if (!checkTimer) checkTimer = window.setTimeout(check, CHECK_MS);
}

function onScroll() {
    if (target) requestAnimationFrame(position);
}

function check() {
    checkTimer = 0;
    if (document.fullscreenElement) return hide();
    if (host?.matches(":hover")) return cancelHide();
    const hit = videoAt(lastX, lastY, isOurUi);
    const video = hit && isBigEnough(hit) ? hit : embedVideo();
    if (video && !isPopped(video) && !isHoverPreview(video)) {
        cancelHide();
        if (video !== target) show(video);
    } else {
        scheduleHide();
    }
}

function canPopOut(video: HTMLVideoElement): boolean {
    return isTopFrame || (fillsFrame(video) && !state.framePopped);
}

function show(video: HTMLVideoElement) {
    const buttons: HTMLButtonElement[] = [];
    const add = (html: string, label: string, onClick: () => void) => {
        const b = document.createElement("button");
        b.innerHTML = html;
        b.title = label;
        b.setAttribute("aria-label", label);
        b.onclick = () => {
            onClick();
            hide();
        };
        buttons.push(b);
    };

    if (canPopOut(video)) {
        add(icons.popOut, "Pop out", () => popOutVideo(video));
    }
    if (canPip(video)) add(icons.pip, "Picture in picture", () => togglePip(video));
    if (downloadUrl(video)) add(icons.download, "Download", () => downloadVideo(video));

    if (!buttons.length) return hide();
    target = video;
    // Buttons depend on what's loaded, so rebuild them if the video loads while you're hovering.
    if (video.readyState < 1) {
        video.addEventListener(
            "loadedmetadata",
            () => {
                if (target !== video) return;
                target = null;
                show(video);
            },
            { once: true }
        );
    }
    pill.replaceChildren(...buttons);
    pill.classList.add("show");
    position();
}

export function popOutVideo(video: HTMLVideoElement) {
    if (isTopFrame) {
        popOut(video);
    } else {
        requestFramePopOut();
    }
}

function position() {
    if (!target) return;
    const left = state.settings.toolbarSide === "left";
    pill.style.left = pill.style.right = "auto";
    if (!isTopFrame && fillsFrame(target)) {
        pill.style.top = "8px";
        pill.style[left ? "left" : "right"] = "8px";
        return;
    }
    const r = visibleRect(target);
    if (!r) return hide();
    pill.style.top = `${Math.max(8, r.top + 8)}px`;
    pill.style[left ? "left" : "right"] = `${Math.max(8, left ? r.left + 8 : innerWidth - r.right + 8)}px`;
}

function scheduleHide() {
    if (!target || hideTimer) return;
    hideTimer = window.setTimeout(hide, HIDE_DELAY_MS);
}

function cancelHide() {
    clearTimeout(hideTimer);
    hideTimer = 0;
}

function hide() {
    cancelHide();
    target = null;
    pill?.classList.remove("show");
}

// Sites like X make the <video> bigger than its card and crop it with overflow, so anchor to the
// part that's actually visible.
function visibleRect(el: Element): { top: number; right: number; left: number } | null {
    const r = el.getBoundingClientRect();
    let top = r.top;
    let right = r.right;
    let bottom = r.bottom;
    let left = r.left;
    let node: Element | null = el.parentElement ?? ((el.getRootNode() as ShadowRoot).host || null);
    // Overflow on <body> and <html> applies to the viewport, and YouTube's <body> has zero height.
    for (let depth = 0; node && node !== document.body && node !== document.documentElement && depth < 20; depth++) {
        const cs = getComputedStyle(node);
        if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
            const c = node.getBoundingClientRect();
            top = Math.max(top, c.top);
            right = Math.min(right, c.right);
            bottom = Math.min(bottom, c.bottom);
            left = Math.max(left, c.left);
        }
        node = node.parentElement ?? ((node.getRootNode() as ShadowRoot).host || null);
    }
    top = Math.max(top, 0);
    bottom = Math.min(bottom, innerHeight);
    if (bottom - top < 40 || right - left < 60) return null;
    return { top, right, left };
}
