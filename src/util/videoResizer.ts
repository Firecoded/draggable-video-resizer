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

    // === DRAG LOGIC (make outerWrapper draggable) ===
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    outerWrapper.style.cursor = "move";

    outerWrapper.addEventListener("mousedown", (e) => {
        const wrapperRect = outerWrapper.getBoundingClientRect();
        const resizeThreshold = 16;
        const controlsHeight = 48; // adjust if controls are taller

        const isNearBottomRight =
            e.clientX > wrapperRect.right - resizeThreshold && e.clientY > wrapperRect.bottom - resizeThreshold;

        const isInControlsArea = e.clientY > wrapperRect.bottom - controlsHeight;

        if (isNearBottomRight || isInControlsArea) return;

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
    const dragHandleIcon = `
    <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="6" width="4" height="4"/>
    <rect x="18" y="6" width="4" height="4"/>
    <rect x="10" y="14" width="4" height="4"/>
    <rect x="18" y="14" width="4" height="4"/>
    <rect x="10" y="22" width="4" height="4"/>
    <rect x="18" y="22" width="4" height="4"/>
    </svg>`;

    const dragBar = document.createElement("div");
    Object.assign(dragBar.style, {
        height: "20px",
        background: "#f1f1f1",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px",
        borderTopLeftRadius: "6px",
        borderTopRightRadius: "6px",
        userSelect: "none",
        cursor: "move",
    });

    // Add drag icon to the left
    const dragIcon = document.createElement("div");
    dragIcon.innerHTML = dragHandleIcon;
    Object.assign(dragIcon.style, {
        color: "#555",
        display: "flex",
        alignItems: "center",
    });

    dragBar.appendChild(dragIcon);
    outerWrapper.appendChild(dragBar);

    return dragBar;
}

function createCloseButton(
    video: HTMLVideoElement,
    placeholder: HTMLDivElement,
    outerWrapper: HTMLDivElement
): HTMLButtonElement {
    const closeBtn = document.createElement("button");

    const closeIcon = `
    <svg width="16" height="16" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <path fill="currentColor" d="M195.2 195.2a64 64 0 0 1 90.496 0L512 421.504 738.304 195.2a64 64 0 0 1 90.496 90.496L602.496 512 828.8 738.304a64 64 0 0 1-90.496 90.496L512 602.496 285.696 828.8a64 64 0 0 1-90.496-90.496L421.504 512 195.2 285.696a64 64 0 0 1 0-90.496z"/>
    </svg>`;
    closeBtn.innerHTML = closeIcon;

    Object.assign(closeBtn.style, {
        position: "absolute",
        right: "4px",
        top: "2px",
        background: "none",
        border: "none",
        outline: "none",
        color: "#000",
        fontSize: "12px",
        cursor: "pointer",
        padding: "0",
        lineHeight: "1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
        placeholder.parentNode?.insertBefore(video, placeholder);
        placeholder.remove();
        outerWrapper.remove();

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
        closeBtn.style.color = "#000";
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
        cursor: "default",
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
    const svgVolume = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6C20 6 21.5 7.8 21.5 12C21.5 16.2 20 18 20 18" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M18 9C18 9 18.5 9.9 18.5 12C18.5 14.1 18 15 18 15" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M1.95863 8.57679C2.24482 8.04563 2.79239 7.53042 3.33997 7.27707C3.9393 6.99979 4.62626 6.99979 6.00018 6.99979C6.51225 6.99979 6.76828 6.99979 7.01629 6.95791C7.26147 6.9165 7.50056 6.84478 7.72804 6.74438C7.95815 6.64283 8.1719 6.50189 8.59941 6.22002L8.81835 6.07566C11.3613 4.39898 12.6328 3.56063 13.7001 3.92487C13.9048 3.9947 14.1029 4.09551 14.2798 4.21984C15.2025 4.86829 15.2726 6.37699 15.4128 9.3944C15.4647 10.5117 15.5001 11.4679 15.5001 11.9998C15.5001 12.5317 15.4647 13.4879 15.4128 14.6052C15.2726 17.6226 15.2025 19.1313 14.2798 19.7797C14.1029 19.9041 13.9048 20.0049 13.7001 20.0747C12.6328 20.4389 11.3613 19.6006 8.81834 17.9239L8.59941 17.7796C8.1719 17.4977 7.95815 17.3567 7.72804 17.2552C7.50056 17.1548 7.26147 17.0831 7.01629 17.0417C6.76828 16.9998 6.51225 16.9998 6.00018 16.9998C4.62626 16.9998 3.9393 16.9998 3.33997 16.7225C2.79239 16.4692 2.24482 15.9539 1.95863 15.4228C1.6454 14.8414 1.60856 14.237 1.53488 13.0282C1.52396 12.849 1.51525 12.6722 1.50928 12.4998" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
    `;

    const svgMuted = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.5001 11.9998C15.5001 12.5317 15.4647 13.4879 15.4128 14.6052C15.2726 17.6226 15.2025 19.1313 14.2798 19.7797C14.1029 19.9041 13.9048 20.0049 13.7001 20.0747C12.7327 20.4048 11.5976 19.747 9.50009 18.3725M7.01629 17.0417C6.76828 16.9998 6.51225 16.9998 6.00018 16.9998C4.62626 16.9998 3.9393 16.9998 3.33997 16.7225C2.79239 16.4692 2.24482 15.9539 1.95863 15.4228C1.6454 14.8414 1.60856 14.237 1.53488 13.0282C1.52396 12.849 1.51525 12.6722 1.50928 12.4998M1.95863 8.57679C2.24482 8.04563 2.79239 7.53042 3.33997 7.27707C3.9393 6.99979 4.62626 6.99979 6.00018 6.99979C6.51225 6.99979 6.76828 6.99979 7.01629 6.95791C7.26147 6.9165 7.50056 6.84478 7.72804 6.74438C7.95815 6.64283 8.1719 6.50189 8.59941 6.22002L8.81835 6.07566C11.3613 4.39898 12.6328 3.56063 13.7001 3.92487C13.9048 3.9947 14.1029 4.09551 14.2798 4.21984C15.1151 4.80685 15.2517 6.09882 15.3741 8.57679" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M20 18C20 18 21.5 16.2 21.5 12C21.5 9.56658 20.9965 7.93882 20.5729 7" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M18 15C18 15 18.5 14.1 18.5 12C18.5 11.1381 18.4158 10.4784 18.3165 10" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M22 2L2 22" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
`;
    const volumeIcon = document.createElement("button");
    volumeIcon.innerHTML = video.muted || video.volume === 0 ? svgMuted : svgVolume;
    Object.assign(volumeIcon.style, {
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: "16px",
        color: "#333",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    });

    // Toggle mute on click
    volumeIcon.onclick = () => {
        video.muted = !video.muted;
        volumeIcon.innerHTML = video.muted || video.volume === 0 ? svgMuted : svgVolume;
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
        const vol = parseFloat(verticalSlider.value);
        video.volume = vol;

        if (video.muted && vol > 0) {
            video.muted = false;
        }

        if (vol === 0) {
            video.muted = true;
        }

        volumeIcon.innerHTML = video.muted ? svgMuted : svgVolume;
    };

    sliderContainer.appendChild(verticalSlider);
    volumeWrapper.appendChild(sliderContainer);
    controls.appendChild(volumeWrapper);

    // Sync icon when volume or mute changes elsewhere
    video.addEventListener("volumechange", () => {
        volumeIcon.innerHTML = video.muted || video.volume === 0 ? svgMuted : svgVolume;
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
