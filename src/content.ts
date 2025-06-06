import { makeVideoResizable } from "./util/videoResizer";

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
            cleanup();
            makeVideoResizable(el as HTMLVideoElement);
        }
    };

    function cleanup() {
        document.removeEventListener("click", onClick, true);
        document.body.style.cursor = "";
    }

    document.addEventListener("click", onClick, true);
    document.body.style.cursor = "crosshair";
}
