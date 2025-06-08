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

// --- Selection Mode Logic ---
let escapeHandler: (e: KeyboardEvent) => void;
let activePicker: ((e: MouseEvent) => void) | null = null;

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "PICK_VIDEO") {
        startVideoPicker();
    }
});

function startVideoPicker() {
    exitSelectionMode(); // in case it was already active

    const onClick = (e: MouseEvent) => {
        const el = e.target as HTMLElement;
        if (el.tagName === "VIDEO") {
            e.preventDefault();
            e.stopPropagation();
            document.body.style.cursor = "";
            makeVideoResizable(el as HTMLVideoElement);
            exitSelectionMode();
        }
    };

    document.body.style.cursor = "crosshair";
    document.addEventListener("click", onClick, { capture: true, once: true });

    escapeHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            exitSelectionMode();
        }
    };
    document.addEventListener("keydown", escapeHandler);

    activePicker = onClick;
}

function exitSelectionMode() {
    if (activePicker) {
        document.removeEventListener("click", activePicker, { capture: true });
        activePicker = null;
    }
    document.removeEventListener("keydown", escapeHandler);
    document.body.style.cursor = "";
}
