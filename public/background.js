chrome.runtime.onMessage.addListener((msg, sender) => {
    if (msg.type === "INJECT_PICKER" && msg.tabId) {
        chrome.scripting.executeScript({
            target: { tabId: msg.tabId },
            files: ["content.js"]
        }, () => {
            // After injection, send message to trigger picker
            chrome.tabs.sendMessage(msg.tabId, { type: "PICK_VIDEO" });
        });
    }
});