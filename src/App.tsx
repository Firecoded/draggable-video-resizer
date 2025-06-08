import "./app.css";

export default function App() {
    return (
        <div className="popup-container">
            <button
                className="primary-button"
                onClick={() => {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]?.id) {
                            chrome.runtime.sendMessage({
                                type: "INJECT_PICKER",
                                tabId: tabs[0].id,
                            });
                        }
                        window.close();
                    });
                }}
            >
                🎯 Pick a video from this website
            </button>

            <button
                className="secondary-button"
                onClick={() => {
                    chrome.tabs.create({ url: chrome.runtime.getURL("instructions.html") });
                }}
            >
                📘 Instructions
            </button>
        </div>
    );
}
