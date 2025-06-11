import "./app.css";

export default function App() {
    const sendMessage = (msg: object) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, msg);
            }
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
                    <img src="info.png" alt="Info" className="info-icon-img" />
                </button>
            </h2>

            <div className="action-section">
                <button className="primary-button" onClick={() => sendMessage({ type: "PICK_VIDEO" })}>
                    🎯 Select a video
                </button>

                <button className="secondary-button" onClick={() => sendMessage({ type: "AUTO_RESIZE_ALL_VIDEOS" })}>
                    📺 Select all videos
                </button>
            </div>
        </div>
    );
}
