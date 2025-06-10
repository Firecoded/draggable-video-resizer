chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "INJECT_PICKER" && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, { type: "PICK_VIDEO" });
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("instructions.html") });
  }
});
