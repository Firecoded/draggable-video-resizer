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

// Handle messages
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "PICK_VIDEO") {
        startVideoPicker(msg.mode);
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

// Picker logic
function startVideoPicker(mode: "resize" | "pip" = "resize") {
    if (activePicker) return;

    const revealVideoUnderCursor = (e: MouseEvent): HTMLVideoElement | null => {
        const peeled: HTMLElement[] = [];
        let elem = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;

        while (elem && !(elem instanceof HTMLVideoElement) && peeled.length < 10) {
            peeled.push(elem);
            const old = elem.style.pointerEvents;
            elem.style.pointerEvents = "none";
            (elem as any).__peOld = old;
            elem = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        }

        for (const el of peeled) {
            el.style.pointerEvents = (el as any).__peOld;
            delete (el as any).__peOld;
        }

        return elem instanceof HTMLVideoElement ? elem : null;
    };

    const onClick = async (e: MouseEvent) => {
        const video = revealVideoUnderCursor(e);
        if (!video) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        if (mode === "resize") {
            makeVideoResizable(video);
        } else if (mode === "pip") {
            try {
                await video.requestPictureInPicture();
            } catch (err) {
                console.warn("Failed to enter PiP mode:", err);
            }
        }

        exitSelectionMode();
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
