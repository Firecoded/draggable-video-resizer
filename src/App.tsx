import { useState, useEffect } from "react";
import "./app.css";

export default function App() {
    const [pipMode, setPipMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [theme, setThemeState] = useState(localStorage.getItem("theme") || "system");

    useEffect(() => {
        chrome.storage.sync.get(["pipMode", "showSettings", "theme"], (res) => {
            setPipMode(!!res.pipMode);
            setShowSettings(!!res.showSettings);

            const savedTheme = res.theme || "system";
            setThemeState(savedTheme);
            applyTheme(savedTheme);
        });
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const listener = () => {
            if (theme === "system") {
                applyTheme("system");
            }
        };

        mediaQuery.addEventListener("change", listener);

        return () => mediaQuery.removeEventListener("change", listener);
    }, [theme]);

    function applyTheme(mode: string) {
        if (mode === "light") {
            document.documentElement.classList.remove("dark");
        } else if (mode === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            document.documentElement.classList.toggle("dark", prefersDark);
        }
    }

    function setTheme(mode: "light" | "dark" | "system") {
        document.documentElement.classList.remove("theme-transition");
        setThemeState(mode);
        chrome.storage.sync.set({ theme: mode });
        applyTheme(mode);
    }

    const handlePipToggle = (checked: boolean) => {
        setPipMode(checked);
        chrome.storage.sync.set({ pipMode: checked });
    };

    const handleSettingsToggle = (show: boolean) => {
        setShowSettings(show);
        chrome.storage.sync.set({ showSettings: show });
    };

    const sendMessage = (msg: object) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, msg);
            window.close();
        });
    };

    return (
        <div className="popup-container">
            <h2 className="popup-title">
                <img src="icon-128.png" alt="Extension Icon" className="popup-title-icon" />
                Draggable Video Resizer
                <button
                    className="info-icon"
                    onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("instructions.html") })}
                    title="View instructions"
                    aria-label="Instructions"
                >
                    <img src="assets/info.png" alt="Info" className="info-icon-img" />
                </button>
            </h2>

            <div className="action-section">
                <button
                    className="primary-button"
                    onClick={() => sendMessage({ type: "PICK_VIDEO", mode: pipMode ? "pip" : "resize" })}
                >
                    {pipMode ? "🎯 Picture-in-Picture a video" : "🎯 Select a video"}
                </button>

                <button className="secondary-button" onClick={() => sendMessage({ type: "AUTO_RESIZE_ALL_VIDEOS" })}>
                    📺 Select all videos
                </button>
            </div>

            <div className="settings-section">
                <button
                    className="gear-button"
                    onClick={() => handleSettingsToggle(!showSettings)}
                    title="Settings"
                    aria-expanded={showSettings}
                >
                    <span className={`arrow ${showSettings ? "up" : "down"}`} />
                    ⚙️
                </button>
            </div>
            {showSettings && (
                <div className="settings-block">
                    <label className="toggle-container">
                        <input type="checkbox" checked={pipMode} onChange={(e) => handlePipToggle(e.target.checked)} />
                        <span className="toggle-slider" />
                        <span className="toggle-label">Enable Picture-in-Picture mode</span>
                    </label>
                    <div className="toggle-label">Theme:</div>
                    <div className="theme-switch">
                        <input
                            id="theme-light"
                            name="theme"
                            type="radio"
                            value="light"
                            className="switch-input"
                            checked={theme === "light"}
                            onChange={() => setTheme("light")}
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
                            checked={theme === "system"}
                            onChange={() => setTheme("system")}
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
                            checked={theme === "dark"}
                            onChange={() => setTheme("dark")}
                        />
                        <label htmlFor="theme-dark" className="switch-label switch-label-dark">
                            Dark
                        </label>

                        <span className="switch-selector" />
                    </div>
                </div>
            )}
        </div>
    );
}
