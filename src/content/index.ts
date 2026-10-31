import type { ContentMessage } from "../shared/messages";
import {
    allDeep,
    bestEmbed,
    bestVideo,
    fillsFrame,
    isBigEnough,
    isHoverPreview,
    isTopFrame,
    videoAt,
} from "./detect";
import { initFloatingWindows, isOurUi, isPopped, lastPopped, popOut, putBack } from "./floatingWindow";
import { initFrameMessaging, requestFramePopOut, requestFramePutBack } from "./frames";
import { initState, state } from "./state";
import { hoveredVideo, initToolbar, popOutVideo } from "./toolbar";

main();

async function main() {
    await initState();
    initFloatingWindows();
    initToolbar();

    let ctxX = -1;
    let ctxY = -1;
    document.addEventListener(
        "contextmenu",
        (e) => {
            ctxX = e.clientX;
            ctxY = e.clientY;
        },
        { capture: true, passive: true }
    );

    initFrameMessaging(popOut, putBack);

    // Picture-in-picture replaces the floating window, so put the video (or its iframe) back.
    document.addEventListener(
        "enterpictureinpicture",
        (e) => {
            const video = e.target as HTMLVideoElement;
            if (isPopped(video)) putBack(video);
            else if (state.framePopped) requestFramePutBack();
        },
        true
    );

    chrome.runtime.onMessage.addListener((msg: ContentMessage) => {
        switch (msg.type) {
            case "POP_OUT_ALL": {
                const videos = allDeep<HTMLVideoElement>("video").filter(
                    (v) => !isPopped(v) && isBigEnough(v) && !isHoverPreview(v)
                );
                if (isTopFrame) videos.forEach((v) => popOut(v));
                else if (!state.framePopped && videos.some(fillsFrame)) requestFramePopOut();
                break;
            }
            case "POP_OUT_BEST": {
                const open = lastPopped();
                if (open) return putBack(open);
                const video = hoveredVideo() ?? bestVideo(isPopped);
                const media = video ?? bestEmbed(isPopped);
                if (media) popOut(media);
                break;
            }
            case "POP_OUT_AT_CONTEXT_MENU": {
                const video = videoAt(ctxX, ctxY, isOurUi) ?? bestVideo(isPopped);
                if (isTopFrame) {
                    if (video) popOut(video);
                } else if (video && !state.framePopped) {
                    popOutVideo(video);
                }
                break;
            }
        }
    });
}
