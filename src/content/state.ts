import { DEFAULT_SETTINGS, loadSettings, resolveDark, type Settings } from "../shared/settings";

export const state = {
    settings: DEFAULT_SETTINGS as Settings,
    // Set when the parent frame has popped out the iframe this script runs in.
    framePopped: false,
};

const listeners = new Set<() => void>();

export function onSettingsChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function notify() {
    listeners.forEach((fn) => fn());
}

export async function initState() {
    state.settings = await loadSettings();
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;
        for (const [key, { newValue }] of Object.entries(changes)) {
            if (key in DEFAULT_SETTINGS) {
                (state.settings as unknown as Record<string, unknown>)[key] =
                    newValue ?? DEFAULT_SETTINGS[key as keyof Settings];
            }
        }
        notify();
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", notify);
}

export function isDark(): boolean {
    return resolveDark(state.settings.theme);
}

export function toolbarAllowedHere(): boolean {
    const host = window.top === window ? location.hostname : topHostname();
    return state.settings.toolbarEnabled && !state.settings.disabledSites.includes(host);
}

// A frame's "site" for the per-site toggle is the page the user sees, not the embed's own host.
function topHostname(): string {
    const origins = location.ancestorOrigins;
    const top = origins?.length ? origins[origins.length - 1] : location.origin;
    try {
        return new URL(top).hostname;
    } catch {
        return location.hostname;
    }
}
