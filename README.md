# 🎥 Draggable Video Resizer

[![Available in the Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Available-brightgreen?logo=google-chrome)](https://chromewebstore.google.com/detail/draggable-video-resizer/elfibhkehlekegpggjaanbbjnnnnbdni)

**Draggable Video Resizer** is a Chrome extension that lets you resize and reposition any video on a webpage. It wraps the video in a draggable, resizable container, giving you full control over its placement without affecting the layout of the page.

---

## 🧩 Features

-   Click and drag any video using a custom top bar
-   Resize from the bottom-right corner
-   Automatically maintains page flow with a placeholder
-   Lightweight, private, and works offline
-   Built with React, TypeScript, Vite, and Tailwind CSS

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

3. **Build the extension:**

    ```bash
    npm run build
    ```

4. **Load into Chrome:**

    - Go to `chrome://extensions`
    - Enable **Developer Mode** (top right)
    - Click **Load unpacked**
    - Select the `dist/` folder

---

## 📖 How to Use

1. Navigate to a webpage with a video.
2. Click the 🧩 extension icon and activate the tool.
3. Click on any video on the page.
4. Use the top bar to drag it around.
5. Resize it freely using the bottom-right corner.

> 💡 See [`instructions.html`](./instructions.html) for a visual guide.

---

## ⚠️ Limitations

-   Not yet compatible with YouTube (due to iframe restrictions).
-   May not work on sites with custom video frameworks.
-   Currently resizes freely, aspect ratio lock not implemented yet.

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
