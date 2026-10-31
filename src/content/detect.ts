export type Media = HTMLVideoElement | HTMLIFrameElement;

export const MIN_WIDTH = 200;
export const MIN_HEIGHT = 112;
export const isTopFrame = window === window.top;

export function isBigEnough(el: Element): boolean {
    const r = el.getBoundingClientRect();
    return (
        r.width >= MIN_WIDTH &&
        r.height >= MIN_HEIGHT &&
        r.bottom > 0 &&
        r.right > 0 &&
        r.top < innerHeight &&
        r.left < innerWidth
    );
}

// An embed frame (YouTube, Vimeo...) whose video fills it gets popped out as a whole iframe by the
// parent frame, since a window confined to the iframe's own box would be useless.
export function fillsFrame(video: HTMLVideoElement): boolean {
    if (isTopFrame) return false;
    const r = video.getBoundingClientRect();
    return r.width * r.height >= 0.6 * innerWidth * innerHeight;
}

// Inside an embed frame the player fills the frame, but before playback starts YouTube parks its
// <video> outside the viewport. Treat any frame-sized video as the frame's player.
export function embedVideo(): HTMLVideoElement | null {
    if (isTopFrame || innerWidth < MIN_WIDTH || innerHeight < MIN_HEIGHT) return null;
    for (const v of document.getElementsByTagName("video")) if (fillsFrame(v)) return v;
    return null;
}

// elementsFromPoint sees through overlays that sites stack on top of their players, and we recurse
// into open shadow roots (Reddit and others render players inside them).
export function videoAt(x: number, y: number, isOurUi: (el: Element) => boolean): HTMLVideoElement | null {
    const search = (root: Document | ShadowRoot, depth: number): HTMLVideoElement | null | "blocked" => {
        for (const el of root.elementsFromPoint(x, y)) {
            if (isOurUi(el)) return "blocked";
            if (el instanceof HTMLVideoElement) return el;
            if (el.shadowRoot && depth < 4) {
                const found = search(el.shadowRoot, depth + 1);
                if (found) return found;
            }
        }
        return null;
    };
    const found = search(document, 0);
    if (found === "blocked") return null;
    return found ?? videoByGeometry(x, y);
}

// Hit testing skips invisible elements, and some players (YouTube embeds before you press play)
// keep their <video> hidden under a thumbnail, so fall back to matching by position.
function videoByGeometry(x: number, y: number): HTMLVideoElement | null {
    for (const v of document.getElementsByTagName("video")) {
        const r = v.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && r.width > 0) return v;
    }
    return null;
}

// Hover previews (YouTube thumbnails, Twitch, etc.) are videos inside a link to the real page.
export function isHoverPreview(video: HTMLVideoElement): boolean {
    for (let el: Element | null = video; el; el = el.parentElement ?? (el.getRootNode() as ShadowRoot).host ?? null) {
        if (el.tagName === "A") return true;
    }
    return false;
}

export function allDeep<T extends Element>(selector: string, root: Document | ShadowRoot = document): T[] {
    const out = Array.from(root.querySelectorAll<T>(selector));
    for (const el of root.querySelectorAll("*")) {
        if (el.shadowRoot) out.push(...allDeep<T>(selector, el.shadowRoot));
    }
    return out;
}

function area(el: Element): number {
    const r = el.getBoundingClientRect();
    return r.width * r.height;
}

export function bestVideo(exclude: (m: Media) => boolean): HTMLVideoElement | null {
    const videos = allDeep<HTMLVideoElement>("video").filter((v) => !exclude(v) && isBigEnough(v) && !isHoverPreview(v));
    const playing = videos.filter((v) => !v.paused);
    const pool = playing.length ? playing : videos;
    return pool.sort((a, b) => area(b) - area(a))[0] ?? null;
}

const EMBED_HOSTS =
    /(^|\.)(youtube\.com|youtube-nocookie\.com|vimeo\.com|twitch\.tv|loom\.com|wistia\.(com|net)|streamable\.com|dailymotion\.com|rumble\.com|kick\.com|facebook\.com|tiktok\.com|bilibili\.com)$/;

export function looksLikeVideoEmbed(frame: HTMLIFrameElement): boolean {
    if (!isBigEnough(frame)) return false;
    try {
        if (EMBED_HOSTS.test(new URL(frame.src).hostname)) return true;
    } catch {
        return false;
    }
    const r = frame.getBoundingClientRect();
    const ratio = r.width / r.height;
    const allowsFullscreen = frame.allowFullscreen || /fullscreen/.test(frame.allow);
    return allowsFullscreen && ratio > 1.2 && ratio < 2.4;
}

export function bestEmbed(exclude: (m: Media) => boolean): HTMLIFrameElement | null {
    return (
        allDeep<HTMLIFrameElement>("iframe")
            .filter((f) => !exclude(f) && looksLikeVideoEmbed(f))
            .sort((a, b) => area(b) - area(a))[0] ?? null
    );
}
