import { makeVideoResizable, cleanupAllWrappers } from "./util/videoResizer";

// Detect URL changes in SPAs and clean up wrappers
let lastUrl = location.href;

const urlObserver = new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        cleanupAllWrappers();
    }
});

urlObserver.observe(document.body, { childList: true, subtree: true });

// Handle messages from popup
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "PICK_VIDEO") {
        startVideoPicker();
    }
});

function startVideoPicker() {
    const onClick = (e: MouseEvent) => {
        const el = e.target as HTMLElement;
        if (el.tagName === "VIDEO") {
            e.preventDefault();
            e.stopPropagation();
            document.body.style.cursor = "";
            makeVideoResizable(el as HTMLVideoElement);
        }
    };

    document.addEventListener("click", onClick, { capture: true, once: true });
    document.body.style.cursor = "crosshair";
}
