const Z_INDEX = 2147483646;
const processedVideos = new WeakSet<HTMLVideoElement>();

export function makeVideoResizable(video: HTMLVideoElement) {
    if (processedVideos.has(video)) return;
    processedVideos.add(video);

    const rect = video.getBoundingClientRect();

    // Create placeholder
    const placeholder = document.createElement("div");
    placeholder.setAttribute("data-resizer-placeholder", "true");
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    placeholder.style.display = getComputedStyle(video).display;
    video.parentNode?.insertBefore(placeholder, video);

    // Outer wrapper for video + controls
    const outerWrapper = document.createElement("div");
    outerWrapper.style.position = "absolute";
    outerWrapper.style.left = `${rect.left + window.scrollX}px`;
    outerWrapper.style.top = `${rect.top + window.scrollY}px`;
    outerWrapper.style.zIndex = `${Z_INDEX}`;
    outerWrapper.style.display = "inline-block";
    // outerWrapper.style.resize = "both";
    outerWrapper.style.overflow = "visible";
    outerWrapper.setAttribute("data-resizer-wrapper", "true");
    document.body.appendChild(outerWrapper);

    // Drag bar
    const dragBar = document.createElement("div");
    dragBar.style.height = "17px";
    dragBar.style.background = "rgba(0, 123, 255, 0.35)";
    dragBar.style.cursor = "move";
    dragBar.style.userSelect = "none";
    dragBar.style.textAlign = "center";
    dragBar.style.fontSize = "12px";
    dragBar.style.color = "#007bff";
    dragBar.style.position = "relative";
    dragBar.style.display = "flex";
    dragBar.style.alignItems = "center";
    dragBar.style.justifyContent = "center";
    dragBar.textContent = "Drag me";
    outerWrapper.appendChild(dragBar);

    // Close (X) button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✖";
    Object.assign(closeBtn.style, {
        position: "absolute",
        right: "4px",
        top: "2px",
        background: "none",
        border: "none",
        outline: "none",
        color: "#fff",
        fontSize: "12px",
        cursor: "pointer",
        padding: "0",
        lineHeight: "1",
    });

    // Store original inline styles
    const originalStyles = {
        position: video.style.position,
        width: video.style.width,
        height: video.style.height,
        display: video.style.display,
        zIndex: video.style.zIndex,
    };

    closeBtn.onclick = () => {
        // Move video back
        placeholder.parentNode?.insertBefore(video, placeholder);
        placeholder.remove();
        outerWrapper.remove();

        // Restore original styles
        video.style.position = originalStyles.position;
        video.style.width = originalStyles.width;
        video.style.height = originalStyles.height;
        video.style.display = originalStyles.display;
        video.style.zIndex = originalStyles.zIndex;

        processedVideos.delete(video);
    };

    closeBtn.onmouseenter = () => {
        closeBtn.style.color = "red";
    };
    closeBtn.onmouseleave = () => {
        closeBtn.style.color = "#fff";
    };

    dragBar.appendChild(closeBtn);

    // Wrapper for just the video (resizable area)
    const videoWrapper = document.createElement("div");
    videoWrapper.style.resize = "both";
    videoWrapper.style.overflow = "hidden";
    videoWrapper.style.position = "relative";
    videoWrapper.style.width = `${rect.width}px`;
    videoWrapper.style.height = `${rect.height}px`;
    videoWrapper.style.backgroundColor = "black";
    outerWrapper.appendChild(videoWrapper);

    // Insert video
    video.controls = false;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.display = "block";
    videoWrapper.appendChild(video);

    // Controls container (below the video)
    const controls = document.createElement("div");
    controls.style.marginTop = "4px";
    controls.style.background = "#f1f1f1";
    controls.style.padding = "8px";
    controls.style.display = "flex";
    controls.style.gap = "8px";
    controls.style.alignItems = "center";
    controls.style.borderRadius = "4px";
    controls.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
    controls.style.fontSize = "14px";
    outerWrapper.appendChild(controls);

    // === Controls ===
    // 1. Play/Pause Button
    const playPauseBtn = document.createElement("button");

    // Initial state
    playPauseBtn.textContent = video.paused ? "▶️" : "⏸️";

    // Click handler
    playPauseBtn.onclick = () => {
        if (video.paused) {
            video.play().catch((err) => {
                console.warn("Video play failed:", err);
            });
        } else {
            video.pause();
        }
    };

    // Styling
    Object.assign(playPauseBtn.style, {
        background: "none",
        border: "none",
        outline: "none",
        color: "#333",
        fontSize: "16px",
        cursor: "pointer",
    });

    // Keep icon in sync
    video.addEventListener("play", () => {
        playPauseBtn.textContent = "⏸️";
    });
    video.addEventListener("pause", () => {
        playPauseBtn.textContent = "▶️";
    });

    // Add to controls
    controls.appendChild(playPauseBtn);

    // 2. Mute toggle
    const muteBtn = document.createElement("button");
    muteBtn.textContent = video.muted ? "🔇" : "🔊";
    muteBtn.onclick = () => {
        video.muted = !video.muted;
        muteBtn.textContent = video.muted ? "🔇" : "🔊";
    };
    muteBtn.style.background = "none";
    muteBtn.style.border = "none";
    muteBtn.style.outline = "none";
    muteBtn.style.color = "#333";
    muteBtn.style.fontSize = "16px";
    muteBtn.style.cursor = "pointer";
    controls.appendChild(muteBtn);

    // 3. Volume slider
    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0";
    volumeSlider.max = "1";
    volumeSlider.step = "0.01";
    volumeSlider.value = String(video.volume);
    volumeSlider.style.width = "100px"; // 🛠️ Limit width
    volumeSlider.oninput = () => {
        video.volume = parseFloat(volumeSlider.value);
    };
    controls.appendChild(volumeSlider);

    // 4. Seek slider
    const seekSlider = document.createElement("input");
    seekSlider.type = "range";
    seekSlider.min = "0";
    seekSlider.max = "100";
    seekSlider.value = "0";
    seekSlider.style.flex = "1";
    controls.appendChild(seekSlider);

    video.addEventListener("timeupdate", () => {
        seekSlider.value = ((video.currentTime / video.duration) * 100).toString();
    });

    seekSlider.oninput = () => {
        video.currentTime = (parseFloat(seekSlider.value) / 100) * video.duration;
    };

    // 5. Loop toggle
    const loopCheckbox = document.createElement("input");
    loopCheckbox.type = "checkbox";
    loopCheckbox.checked = video.loop;
    loopCheckbox.onchange = () => {
        video.loop = loopCheckbox.checked;
    };

    const loopLabel = document.createElement("label");
    loopLabel.style.color = "#333";
    loopLabel.style.display = "flex";
    loopLabel.style.alignItems = "center";
    loopLabel.style.gap = "4px";
    loopLabel.style.fontSize = "14px";
    loopLabel.textContent = ""; // clear text first
    loopLabel.appendChild(loopCheckbox);
    loopLabel.appendChild(document.createTextNode("Loop"));
    controls.appendChild(loopLabel);

    // === Drag logic ===
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    dragBar.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX - outerWrapper.offsetLeft;
        startY = e.clientY - outerWrapper.offsetTop;
        document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        outerWrapper.style.left = `${e.clientX - startX}px`;
        outerWrapper.style.top = `${e.clientY - startY}px`;
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        document.body.style.userSelect = "";
    });
}

export function cleanupAllWrappers() {
    document.querySelectorAll("[data-resizer-wrapper]").forEach((el) => el.remove());
    document.querySelectorAll("[data-resizer-placeholder]").forEach((el) => el.remove());
}
