import type { BackgroundMessage } from "../shared/messages";

// Chrome Web Store policy forbids downloading YouTube videos.
const BLOCKED_HOSTS = /(^|\.)(youtube\.com|youtube-nocookie\.com|googlevideo\.com)$/;

// Streaming sites play through blob: URLs or HLS/DASH manifests, which aren't a downloadable file.
export function downloadUrl(video: HTMLVideoElement): string | null {
    if (BLOCKED_HOSTS.test(location.hostname)) return null;
    const src = video.currentSrc || video.src || video.querySelector("source")?.src || "";
    if (!/^https?:/i.test(src)) return null;
    if (/\.(m3u8|mpd)(\?|#|$)/i.test(src)) return null;
    return src;
}

export function downloadVideo(video: HTMLVideoElement) {
    const url = downloadUrl(video);
    if (!url) return;
    const ext = new URL(url).pathname.match(/\.(mp4|webm|mov|m4v|ogv|mkv)$/i)?.[1] ?? "mp4";
    const title = clean(document.title.replace(/^\(\d+\+?\)\s*/, "")).slice(0, 80);
    const site = clean(pageHost().replace(/^www\./, ""));
    const filename = [title, site, timestamp()].filter(Boolean).join(" - ");
    const msg: BackgroundMessage = { type: "DOWNLOAD", url, filename: `${filename}.${ext}` };
    chrome.runtime.sendMessage(msg);
}

function clean(s: string): string {
    return s
        .replace(/[\\/:*?"<>|~]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Embeds should be named after the page you were on, not the video host.
function pageHost(): string {
    const origins = location.ancestorOrigins;
    try {
        return origins?.length ? new URL(origins[origins.length - 1]).hostname : location.hostname;
    } catch {
        return location.hostname;
    }
}

function timestamp(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}`;
}
