import { makeVideoResizable, cleanupAllWrappers } from "./util/videoResizer";

// --- SPA Navigation Detection ---
let lastUrl = location.href;

const urlObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        cleanupAllWrappers();
        exitSelectionMode();
    }
});

urlObserver.observe(document.body, { childList: true, subtree: true });

// --- Picker state ---
let activePicker: ((e: MouseEvent) => void) | null = null;
let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "PICK_VIDEO") {
        startVideoPicker();
    }
    if (msg.type === "AUTO_RESIZE_ALL_VIDEOS") {
        document.querySelectorAll("video").forEach((video) => {
            const rect = video.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                makeVideoResizable(video);
            }
        });
    }
});

function startVideoPicker() {
    if (activePicker) return;

    const onClick = (e: MouseEvent) => {
        const el = e.target as HTMLElement;
        if (el.tagName === "VIDEO") {
            e.preventDefault();
            e.stopPropagation();
            makeVideoResizable(el as HTMLVideoElement);
            exitSelectionMode();
        }
    };

    const onEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") exitSelectionMode();
    };

    document.body.style.cursor = "crosshair";
    document.addEventListener("click", onClick, { capture: true, once: true });
    document.addEventListener("keydown", onEscape);

    activePicker = onClick;
    escapeHandler = onEscape;
}

function exitSelectionMode() {
    if (activePicker) {
        document.removeEventListener("click", activePicker, { capture: true });
        activePicker = null;
    }

    if (escapeHandler) {
        document.removeEventListener("keydown", escapeHandler);
        escapeHandler = null;
    }

    document.body.style.cursor = "";
}
