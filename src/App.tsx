import { useState, useEffect } from "react";
import "./app.css";

export default function App() {
    const [pipMode, setPipMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        chrome.storage.sync.get("pipMode", (res) => setPipMode(!!res.pipMode));
        chrome.storage.sync.get("showSettings", (res) => setShowSettings(!!res.showSettings));
    }, []);

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
                </div>
            )}
        </div>
    );
}
