import type { BackgroundMessage, ContentMessage, PendingDownload } from "./shared/messages";

const MENU_ID = "pop-out-video";

function send(tabId: number, msg: ContentMessage, frameId?: number) {
    const opts = frameId === undefined ? {} : { frameId };
    chrome.tabs.sendMessage(tabId, msg, opts).catch(() => {
        // No content script in that tab or frame (chrome:// pages, tabs not yet reloaded).
    });
}

chrome.runtime.onInstalled.addListener((details) => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: MENU_ID,
            title: "Pop out video",
            contexts: ["all"],
            documentUrlPatterns: ["http://*/*", "https://*/*"],
        });
    });

    if (details.reason === "install") {
        chrome.tabs.create({ url: chrome.runtime.getURL("instructions.html?install=true") });
    }

    // 2.0 replaced the select-a-video flow, so existing users get one look at the new guide. Later
    // updates and dev reloads (previousVersion is already 2.x) stay quiet.
    if (details.reason === "update" && parseInt(details.previousVersion ?? "2", 10) < 2) {
        chrome.tabs.create({ url: chrome.runtime.getURL("instructions.html?updated=true") });
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== MENU_ID || !tab?.id) return;
    send(tab.id, { type: "POP_OUT_AT_CONTEXT_MENU" }, info.frameId ?? 0);
});

chrome.commands.onCommand.addListener((command, tab) => {
    if (command !== "pop-out-video" || !tab?.id) return;
    send(tab.id, { type: "POP_OUT_BEST" }, 0);
});

chrome.runtime.onMessage.addListener((msg: BackgroundMessage) => {
    if (msg.type === "DOWNLOAD") startDownload({ url: msg.url, filename: msg.filename });
});

// `npm run dev` rewrites reload.json after every rebuild. The extension API call in the loop also
// keeps the service worker from going idle, which would stop the polling.
if (import.meta.env.MODE === "development") {
    let last: number | undefined;
    setInterval(async () => {
        chrome.runtime.getPlatformInfo();
        try {
            const res = await fetch(chrome.runtime.getURL("reload.json"), { cache: "no-store" });
            const { t } = (await res.json()) as { t: number };
            if (last !== undefined && t !== last) chrome.runtime.reload();
            last = t;
        } catch {
            // Mid-rebuild, try again next tick.
        }
    }, 1000);
}

// Downloads is an optional permission so the update doesn't disable the extension for existing
// users. Chrome only lets an extension page request it, so the first download opens a small prompt.
async function startDownload(pending: PendingDownload) {
    if (await chrome.permissions.contains({ permissions: ["downloads"] })) {
        chrome.downloads.download({ url: pending.url, filename: pending.filename });
        return;
    }
    await chrome.storage.session.set({ pendingDownload: pending });
    chrome.windows.create({
        url: chrome.runtime.getURL("permission.html"),
        type: "popup",
        width: 420,
        height: 260,
        focused: true,
    });
}
