# 🎥 Draggable Video Pop Out

[![Available in the Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-brightgreen?logo=google-chrome)](https://chromewebstore.google.com/detail/draggable-video-resizer/elfibhkehlekegpggjaanbbjnnnnbdni)

**Draggable Video Pop Out** is a Chrome extension that pops any video out into a floating, resizable player that stays put while you scroll, with picture in picture in one click.

---

## 🧩 Features

-   Hover toolbar on every video: pop out, picture-in-picture, download
-   Floating window that stays put while you scroll and resizes from any edge
-   Works on YouTube, Vimeo and other iframe embeds without reloading them
-   Keyboard shortcut and right-click menu
-   Light, dark and system themes

---

## 🚀 Installation (Development)

1. **Clone the repository:**

    ```bash
    git clone https://github.com/firecoded/draggable-video-resizer.git
    cd draggable-video-resizer
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Start the dev watcher:**

    ```bash
    npm run dev
    ```

4. **Load into Chrome (first time only):**

    - Go to `chrome://extensions`
    - Enable **Developer Mode** (top right)
    - Click **Load unpacked** and select the `dist/` folder (the dev script copies its path to your clipboard; press Cmd+Shift+G in the file picker to paste it)

    From then on, saving a file rebuilds and reloads the extension. Refresh the page you are testing on to pick up content script changes.

5. **Release build:** `npm run build` for a production `dist/`, or `npm run zip` for the Chrome Web Store upload. Run either after stopping `npm run dev`, since they share `dist/`.

---

## 📖 How to Use

1. Hover any video (including YouTube and other embeds) and click **Pop out** in the toolbar that appears.
2. Drag the floating window anywhere and resize it from any edge or corner. Hold Shift to resize freely.
3. Close the window to put the video back.

Also: **Alt+Shift+V** pops out the video under the cursor, right-click offers **Pop out video**, and the extension menu has "Pop out all videos" plus settings.

> 💡 See [`instructions.html`](./public/instructions.html) for the full guide.

---

## ⚠️ Limitations

-   Embeds only get drag, resize and fullscreen, since the extension can't reach inside another site's player.
-   Download only works for regular video files, not streaming sites, and is disabled on YouTube.

---

## 📄 Usage Notice

This project was built as a personal project.

Feel free to explore the code and use it for learning purposes.  
However, please do not copy, repackage, or publish this project as your own.

---

## 🙏 Acknowledgements

This project uses:

-   [Vite](https://vitejs.dev/)
-   [React](https://react.dev/)
-   [TypeScript](https://www.typescriptlang.org/)
