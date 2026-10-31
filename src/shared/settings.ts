export type Theme = "light" | "dark" | "system";
export type ToolbarSide = "left" | "right";

export interface Settings {
    theme: Theme;
    toolbarEnabled: boolean;
    toolbarSide: ToolbarSide;
    disabledSites: string[];
}

export const DEFAULT_SETTINGS: Settings = {
    theme: "system",
    toolbarEnabled: true,
    toolbarSide: "right",
    disabledSites: [],
};

export async function loadSettings(): Promise<Settings> {
    return (await chrome.storage.sync.get(DEFAULT_SETTINGS)) as Settings;
}

export function resolveDark(theme: Theme): boolean {
    return theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
}
