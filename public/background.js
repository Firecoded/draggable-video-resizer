chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "INJECT_PICKER" && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, { type: "PICK_VIDEO" });
  }
});
