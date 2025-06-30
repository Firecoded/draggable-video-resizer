const Z_INDEX = 2147483646;
const processedVideos = new WeakSet<HTMLVideoElement>();

export function makeVideoResizable(video: HTMLVideoElement) {
    if (processedVideos.has(video)) return;
    processedVideos.add(video);
    const rect = video.getBoundingClientRect();

    const placeholder = createPlaceholder(video, rect);
    const outerWrapper = createOuterWrapper(rect);
    const dragBar = createDragBar(outerWrapper);
    const closeBtn = createCloseButton(video, placeholder, outerWrapper);

    dragBar.appendChild(closeBtn);

    // Wrapper for just the video (resizable area)
    const videoWrapper = createVideoWrapper(rect, outerWrapper);

    // Insert video
    video.controls = false;
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.display = "block";
    videoWrapper.appendChild(video);

    // Controls container (below the video)
    createVideoControls(video, outerWrapper);

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

function createPlaceholder(video: HTMLVideoElement, rect: DOMRect): HTMLDivElement {
    const placeholder = document.createElement("div");
    placeholder.setAttribute("data-resizer-placeholder", "true");
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    placeholder.style.display = getComputedStyle(video).display;
    video.parentNode?.insertBefore(placeholder, video);
    return placeholder;
}

function createOuterWrapper(rect: DOMRect): HTMLDivElement {
    const outerWrapper = document.createElement("div");

    Object.assign(outerWrapper.style, {
        position: "absolute",
        left: `${rect.left + window.scrollX}px`,
        top: `${rect.top + window.scrollY}px`,
        zIndex: `${Z_INDEX}`,
        display: "inline-block",
        overflow: "visible",
    });

    outerWrapper.setAttribute("data-resizer-wrapper", "true");
    document.body.appendChild(outerWrapper);
    return outerWrapper;
}

function createDragBar(outerWrapper: HTMLDivElement): HTMLDivElement {
    const dragBar = document.createElement("div");
    dragBar.textContent = "Drag me";

    Object.assign(dragBar.style, {
        height: "17px",
        background: "rgba(0, 123, 255, 0.35)",
        cursor: "move",
        userSelect: "none",
        textAlign: "center",
        fontSize: "12px",
        color: "#007bff",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    });

    outerWrapper.appendChild(dragBar);
    return dragBar;
}

function createCloseButton(
    video: HTMLVideoElement,
    placeholder: HTMLDivElement,
    outerWrapper: HTMLDivElement
): HTMLButtonElement {
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

    return closeBtn;
}

function createVideoWrapper(rect: DOMRect, outerWrapper: HTMLDivElement) {
    const videoWrapper = document.createElement("div");

    Object.assign(videoWrapper.style, {
        resize: "both",
        overflow: "hidden",
        position: "relative",
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        backgroundColor: "black",
    });

    outerWrapper.appendChild(videoWrapper);
    return videoWrapper;
}

function createVideoControls(video: HTMLVideoElement, outerWrapper: HTMLDivElement) {
    // controls container
    const controls = document.createElement("div");

    Object.assign(controls.style, {
        background: "#f1f1f1",
        padding: "6px",
        display: "flex",
        gap: "8px",
        alignItems: "center",
        borderRadius: "4px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        fontSize: "14px",
    });

    outerWrapper.appendChild(controls);

    // 1. Play/Pause Button
    const playPauseBtn = document.createElement("button");

    const svgPlay = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#1C274C" stroke-width="1.5"/>
    <path d="M15.4137 10.941C16.1954 11.4026 16.1954 12.5974 15.4137 13.059L10.6935 15.8458C9.93371 16.2944 9 15.7105 9 14.7868V9.21316C9 8.28947 9.93371 7.70561 10.6935 8.15419L15.4137 10.941Z" stroke="#1C274C" stroke-width="1.5"/>
    </svg>
    `;

    const svgPause = `
    <svg width="20" height="20" viewBox="0 0 56 56" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M 27.9999 51.9063 C 41.0546 51.9063 51.9063 41.0781 51.9063 28 C 51.9063 14.9453 41.0312 4.0937 27.9765 4.0937 C 14.8983 4.0937 4.0937 14.9453 4.0937 28 C 4.0937 41.0781 14.9218 51.9063 27.9999 51.9063 Z M 27.9999 47.9219 C 16.9374 47.9219 8.1014 39.0625 8.1014 28 C 8.1014 16.9609 16.914 8.0781 27.9765 8.0781 C 39.0155 8.0781 47.8983 16.9609 47.9219 28 C 47.9454 39.0625 39.039 47.9219 27.9999 47.9219 Z M 21.578 36.8828 H 23.8046 C 24.9062 36.8828 25.4218 36.2734 25.4218 35.3828 V 20.6406 C 25.4218 19.75 24.9062 19.1406 23.8046 19.1406 H 21.578 C 20.4296 19.1406 19.914 19.75 19.914 20.6406 V 35.3828 C 19.914 36.2734 20.4296 36.8828 21.578 36.8828 Z M 32.1718 36.8828 H 34.3983 C 35.5234 36.8828 36.039 36.2734 36.039 35.3828 V 20.6406 C 36.039 19.75 35.5234 19.1406 34.3983 19.1406 H 32.1718 C 31.0702 19.1406 30.5312 19.75 30.5312 20.6406 V 35.3828 C 30.5312 36.2734 31.0702 36.8828 32.1718 36.8828 Z"/>
    </svg>
    `;

    // Initial state
    playPauseBtn.innerHTML = video.paused ? svgPlay : svgPause;

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
        cursor: "pointer",
        padding: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    });

    // Keep icon in sync
    video.addEventListener("play", () => {
        playPauseBtn.innerHTML = svgPause;
    });
    video.addEventListener("pause", () => {
        playPauseBtn.innerHTML = svgPlay;
    });

    controls.appendChild(playPauseBtn);

    // Volume wrapper
    const volumeWrapper = document.createElement("div");
    volumeWrapper.style.position = "relative";

    // Hover to show/hide volume slider
    volumeWrapper.addEventListener("mouseenter", () => {
        sliderContainer.style.display = "block";
    });
    volumeWrapper.addEventListener("mouseleave", () => {
        sliderContainer.style.display = "none";
    });

    // Volume/mute toggle button
    const volumeIcon = document.createElement("button");
    volumeIcon.textContent = video.muted ? "🔇" : "🔊";
    Object.assign(volumeIcon.style, {
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "16px",
        color: "#333",
    });

    // Toggle mute on click
    volumeIcon.onclick = () => {
        video.muted = !video.muted;
        volumeIcon.textContent = video.muted ? "🔇" : "🔊";
    };

    volumeWrapper.appendChild(volumeIcon);

    // Slider container
    const sliderContainer = document.createElement("div");
    Object.assign(sliderContainer.style, {
        position: "absolute",
        bottom: "36px", // higher
        left: "50%",
        transform: "translateX(-50%)",
        display: "none",
        padding: "4px",
        zIndex: "999",
    });

    // Volume slider
    const verticalSlider = document.createElement("input");
    verticalSlider.type = "range";
    verticalSlider.min = "0";
    verticalSlider.max = "1";
    verticalSlider.step = "0.01";
    verticalSlider.value = String(video.volume);
    Object.assign(verticalSlider.style, {
        transform: "rotate(-90deg)",
        height: "80px",
        cursor: "pointer",
    });

    // Update volume
    verticalSlider.oninput = () => {
        video.volume = parseFloat(verticalSlider.value);
        if (video.muted && video.volume > 0) {
            video.muted = false;
            volumeIcon.textContent = "🔊";
        }
        if (video.volume === 0) {
            video.muted = true;
            volumeIcon.textContent = "🔇";
        }
    };

    sliderContainer.appendChild(verticalSlider);
    volumeWrapper.appendChild(sliderContainer);
    controls.appendChild(volumeWrapper);

    // Sync icon when volume or mute changes elsewhere
    video.addEventListener("volumechange", () => {
        volumeIcon.textContent = video.muted || video.volume === 0 ? "🔇" : "🔊";
    });

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
    const loopBtn = document.createElement("button");
    const svgLoopIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="20" height="20" fill="currentColor">
    <path d="M83.729,23.57c-0.007-0.562-0.32-1.084-0.825-1.337c-0.503-0.259-1.107-0.212-1.568,0.114l-5.944,4.262l-0.468,0.336
        c-6.405-6.391-15.196-10.389-24.938-10.389c-13.284,0-24.878,7.354-30.941,18.201l0.024,0.013
        c-0.548,1.183-0.124,2.607,1.026,3.271c0.001,0,0.001,0,0.002,0.001l8.136,4.697c1.218,0.704,2.777,0.287,3.48-0.932
        c0.006-0.011,0.009-0.023,0.015-0.034c3.591-6.404,10.438-10.747,18.289-10.747c4.879,0,9.352,1.696,12.914,4.5l-1.001,0.719
        l-5.948,4.262c-0.455,0.327-0.696,0.89-0.611,1.447c0.081,0.558,0.471,1.028,1.008,1.208l25.447,8.669
        c0.461,0.162,0.966,0.084,1.367-0.203c0.399-0.29,0.629-0.746,0.627-1.23L83.729,23.57z"/>
    <path d="M79.904,61.958c0,0-0.001,0-0.002-0.001l-8.136-4.697c-1.218-0.704-2.777-0.287-3.48,0.932
        c-0.006,0.011-0.009,0.023-0.015,0.034c-3.591,6.404-10.438,10.747-18.289,10.747c-4.879,0-9.352-1.696-12.914-4.5l1.001-0.719
        l5.948-4.262c0.455-0.327,0.696-0.89,0.611-1.447c-0.081-0.558-0.471-1.028-1.008-1.208l-25.447-8.669
        c-0.461-0.162-0.966-0.084-1.367,0.203c-0.399,0.29-0.629,0.746-0.627,1.23l0.092,26.828c0.007,0.562,0.32,1.084,0.825,1.337
        c0.503,0.259,1.107,0.212,1.568-0.114l5.944-4.262l0.468-0.336c6.405,6.391,15.196,10.389,24.938,10.389
        c13.284,0,24.878-7.354,30.941-18.201L80.93,65.23C81.478,64.046,81.055,62.623,79.904,61.958z"/>
    </svg>
    `;
    loopBtn.innerHTML = svgLoopIcon;

    Object.assign(loopBtn.style, {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: video.loop ? "#007bff" : "#666", // style controls icon fill
        transition: "color 0.2s ease",
    });

    loopBtn.title = "Toggle Loop";

    loopBtn.onclick = () => {
        video.loop = !video.loop;
        loopBtn.style.color = video.loop ? "#007bff" : "#666";
    };

    controls.appendChild(loopBtn);
}
