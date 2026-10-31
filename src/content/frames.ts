import { allDeep } from "./detect";
import { state } from "./state";

// An embed can't pop itself out (its window would be stuck inside the iframe's box), so it asks
// the parent frame to pop out the whole iframe. event.source tells the parent which iframe asked.
const KEY = "draggable-video-resizer";

type FrameMessage =
    | { [KEY]: "pop-out-frame" }
    | { [KEY]: "put-back-frame" }
    | { [KEY]: "frame-popped"; popped: boolean };

export function requestFramePopOut() {
    const msg: FrameMessage = { [KEY]: "pop-out-frame" };
    window.parent.postMessage(msg, "*");
}

export function requestFramePutBack() {
    const msg: FrameMessage = { [KEY]: "put-back-frame" };
    window.parent.postMessage(msg, "*");
}

export function notifyFramePopped(frame: HTMLIFrameElement, popped: boolean) {
    const msg: FrameMessage = { [KEY]: "frame-popped", popped };
    frame.contentWindow?.postMessage(msg, "*");
}

export function initFrameMessaging(
    onPopOutRequest: (frame: HTMLIFrameElement) => void,
    onPutBackRequest: (frame: HTMLIFrameElement) => void
) {
    addEventListener("message", (e: MessageEvent) => {
        const data = e.data as Partial<FrameMessage> | null;
        const kind = data?.[KEY];
        if (kind === "pop-out-frame" || kind === "put-back-frame") {
            const frame = allDeep<HTMLIFrameElement>("iframe").find((f) => f.contentWindow === e.source);
            if (frame) (kind === "pop-out-frame" ? onPopOutRequest : onPutBackRequest)(frame);
        } else if (kind === "frame-popped" && e.source === window.parent) {
            state.framePopped = !!(data as { popped?: boolean }).popped;
        }
    });
}
