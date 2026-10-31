import "./popup.css";
import type { PendingDownload } from "./shared/messages";
import { loadSettings, resolveDark } from "./shared/settings";

loadSettings().then((s) => document.documentElement.classList.toggle("dark", resolveDark(s.theme)));

const error = document.getElementById("error")!;

document.getElementById("cancel")!.onclick = async () => {
    await chrome.storage.session.remove("pendingDownload");
    window.close();
};

document.getElementById("allow")!.onclick = async () => {
    const granted = await chrome.permissions.request({ permissions: ["downloads"] });
    if (!granted) {
        error.textContent = "Downloads weren't allowed. You can turn them on later from the extension menu.";
        error.hidden = false;
        return;
    }
    const { pendingDownload } = (await chrome.storage.session.get("pendingDownload")) as {
        pendingDownload?: PendingDownload;
    };
    await chrome.storage.session.remove("pendingDownload");
    if (pendingDownload) {
        await chrome.downloads.download({ url: pendingDownload.url, filename: pendingDownload.filename });
    }
    window.close();
};
