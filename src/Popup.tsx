import { useState, useEffect } from "react";
import "./popup.css";
import { icons } from "./content/icons";
import type { ContentMessage } from "./shared/messages";
import { DEFAULT_SETTINGS, loadSettings, resolveDark, type Settings, type Theme } from "./shared/settings";

const REVIEW_URL = "https://chromewebstore.google.com/detail/elfibhkehlekegpggjaanbbjnnnnbdni/reviews";
const REVIEW_AFTER_POP_OUTS = 5;

export default function Popup() {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
    const [downloadsAllowed, setDownloadsAllowed] = useState(false);
    const [shortcut, setShortcut] = useState("");
    const [notice, setNotice] = useState("");
    const [askReview, setAskReview] = useState(false);

    const host = tab?.url && /^https?:/.test(tab.url) ? new URL(tab.url).hostname : null;
    const siteEnabled = host ? !settings.disabledSites.includes(host) : true;

    useEffect(() => {
        loadSettings().then((s) => {
            setSettings(s);
            applyTheme(s.theme);
        });
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => setTab(tabs[0] ?? null));
        chrome.permissions.contains({ permissions: ["downloads"] }, setDownloadsAllowed);
        chrome.storage.local.get({ popOutCount: 0, reviewDismissed: false }, (res) => {
            setAskReview((res.popOutCount as number) >= REVIEW_AFTER_POP_OUTS && !res.reviewDismissed);
        });
        chrome.commands.getAll((cmds) => setShortcut(cmds.find((c) => c.name === "pop-out-video")?.shortcut ?? ""));
    }, []);

    useEffect(() => {
        // On macOS the system theme can flip with the time of day while the popup is open.
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const listener = () => settings.theme === "system" && applyTheme("system");
        mediaQuery.addEventListener("change", listener);
        return () => mediaQuery.removeEventListener("change", listener);
    }, [settings.theme]);

    function applyTheme(theme: Theme) {
        document.documentElement.classList.toggle("dark", resolveDark(theme));
    }

    function update(patch: Partial<Settings>) {
        setSettings((s) => ({ ...s, ...patch }));
        chrome.storage.sync.set(patch);
    }

    function handleSetTheme(theme: Theme) {
        document.documentElement.classList.remove("theme-transition");
        update({ theme });
        applyTheme(theme);
    }

    function handleSiteToggle(enabled: boolean) {
        if (!host) return;
        const others = settings.disabledSites.filter((h) => h !== host);
        update({ disabledSites: enabled ? others : [...others, host] });
    }

    async function handleDownloadsToggle(allow: boolean) {
        const ok = allow
            ? await chrome.permissions.request({ permissions: ["downloads"] })
            : !(await chrome.permissions.remove({ permissions: ["downloads"] }));
        setDownloadsAllowed(ok);
    }

    function dismissReview() {
        setAskReview(false);
        chrome.storage.local.set({ reviewDismissed: true });
    }

    async function popOutAll() {
        if (!tab?.id || !host) {
            setNotice("Videos can't be popped out on this page.");
            return;
        }
        const msg: ContentMessage = { type: "POP_OUT_ALL" };
        try {
            await chrome.tabs.sendMessage(tab.id, msg);
            window.close();
        } catch {
            setNotice("Refresh this page to use the extension here.");
        }
    }

    return (
        <div className="popup-container">
            <h2 className="popup-title">
                <img src="icon-128.png" alt="Extension Icon" className="popup-title-icon" />
                Draggable Video Pop Out
                <button
                    className="info-icon"
                    onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("instructions.html") })}
                    title="View instructions"
                    aria-label="Instructions"
                >
                    <img src="assets/info.png" alt="Info" className="info-icon-img" />
                </button>
            </h2>

            {askReview && (
                <div className="review-prompt">
                    <span>
                        Enjoying it?{" "}
                        <a href={REVIEW_URL} target="_blank" rel="noreferrer" onClick={dismissReview}>
                            Leave a review
                        </a>
                    </span>
                    <button
                        className="review-dismiss"
                        onClick={dismissReview}
                        aria-label="Dismiss"
                        title="Dismiss"
                        dangerouslySetInnerHTML={{ __html: icons.close }}
                    />
                </div>
            )}

            <div className="action-section">
                <button className="primary-button" onClick={popOutAll}>
                    Pop out all videos
                </button>
                {notice && <p className="popup-notice">{notice}</p>}
                <div className="popup-hint">
                    <p>Hover any video. These buttons appear in its top {settings.toolbarSide} corner:</p>
                    <ul className="hint-legend">
                        <li>
                            <Icon svg={icons.popOut} /> Pop out into a floating window
                        </li>
                        <li>
                            <Icon svg={icons.pip} /> Picture-in-picture
                        </li>
                        <li>
                            <Icon svg={icons.download} /> Download, on regular video files
                        </li>
                    </ul>
                    <p>
                        {shortcut ? (
                            <>
                                Or press <kbd>{shortcut}</kbd>, or right-click a video.
                            </>
                        ) : (
                            "Or right-click a video."
                        )}
                    </p>
                </div>
            </div>

            <div className="settings-block">
                <label className="toggle-container">
                    <input
                        type="checkbox"
                        checked={settings.toolbarEnabled}
                        onChange={(e) => update({ toolbarEnabled: e.target.checked })}
                    />
                    <span className="toggle-slider" />
                    <span className="toggle-label">Show toolbar on videos</span>
                </label>
                {settings.toolbarEnabled && (
                    <div className="side-setting">
                        <span className="toggle-label">Icon position</span>
                        <div className="side-switch" role="group" aria-label="Icon position">
                            {(["left", "right"] as const).map((side) => (
                                <button
                                    key={side}
                                    className={settings.toolbarSide === side ? "active" : ""}
                                    aria-pressed={settings.toolbarSide === side}
                                    onClick={() => update({ toolbarSide: side })}
                                >
                                    {side === "left" ? "Left" : "Right"}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {host && settings.toolbarEnabled && (
                    <label className="toggle-container">
                        <input
                            type="checkbox"
                            checked={siteEnabled}
                            onChange={(e) => handleSiteToggle(e.target.checked)}
                        />
                        <span className="toggle-slider" />
                        <span className="toggle-label toggle-label-site">Show on {host}</span>
                    </label>
                )}
                <label className="toggle-container">
                    <input
                        type="checkbox"
                        checked={downloadsAllowed}
                        onChange={(e) => handleDownloadsToggle(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                    <span className="toggle-label">Allow downloads</span>
                </label>
                <p className="toggle-help">
                    Works on regular video files. Not on YouTube or most X, Reddit and Twitch videos.
                </p>

                <div className="toggle-label">Theme:</div>
                <div className="theme-switch">
                    <input
                        id="theme-light"
                        name="theme"
                        type="radio"
                        value="light"
                        className="switch-input"
                        checked={settings.theme === "light"}
                        onChange={() => handleSetTheme("light")}
                    />
                    <label htmlFor="theme-light" className="switch-label switch-label-light">
                        Light
                    </label>

                    <input
                        id="theme-system"
                        name="theme"
                        type="radio"
                        value="system"
                        className="switch-input"
                        checked={settings.theme === "system"}
                        onChange={() => handleSetTheme("system")}
                    />
                    <label htmlFor="theme-system" className="switch-label switch-label-system">
                        System
                    </label>

                    <input
                        id="theme-dark"
                        name="theme"
                        type="radio"
                        value="dark"
                        className="switch-input"
                        checked={settings.theme === "dark"}
                        onChange={() => handleSetTheme("dark")}
                    />
                    <label htmlFor="theme-dark" className="switch-label switch-label-dark">
                        Dark
                    </label>

                    <span className="switch-selector" />
                </div>
            </div>
        </div>
    );
}

function Icon({ svg }: { svg: string }) {
    return <span className="hint-icon" dangerouslySetInnerHTML={{ __html: svg }} />;
}
