export default function App() {
    return (
        <div className="min-w-[320px] p-4 space-y-3 bg-white text-sm">
            <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded w-full"
                onClick={() => {
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]?.id) {
                            chrome.tabs.sendMessage(tabs[0].id, { type: "PICK_VIDEO" });
                        }
                        window.close();
                    });
                }}
            >
                🎯 Pick a video from this website
            </button>

            <label className="flex items-center space-x-2 text-gray-700">
                <input type="checkbox" />
                <span>Always resize all videos automatically</span>
            </label>
        </div>
    );
}
