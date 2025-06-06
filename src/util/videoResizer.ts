const Z_INDEX = 2147483646;
const processedVideos = new WeakSet<HTMLVideoElement>();

export function makeVideoResizable(video: HTMLVideoElement) {
    if (processedVideos.has(video)) return;
    processedVideos.add(video);

    const rect = video.getBoundingClientRect();

    // Create placeholder to preserve layout
    const placeholder = document.createElement("div");
    placeholder.setAttribute("data-resizer-placeholder", "true");
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    placeholder.style.display = getComputedStyle(video).display;
    if (!video.parentNode) return;
    video.parentNode.insertBefore(placeholder, video);

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-resizer-wrapper", "true");
    wrapper.style.position = "absolute";
    wrapper.style.left = `${rect.left + window.scrollX}px`;
    wrapper.style.top = `${rect.top + window.scrollY}px`;
    wrapper.style.width = `${rect.width}px`;
    wrapper.style.height = `${rect.height}px`;
    wrapper.style.resize = "both";
    wrapper.style.overflow = "hidden";
    wrapper.style.zIndex = `${Z_INDEX}`;
    wrapper.style.backgroundColor = "black";
    document.body.appendChild(wrapper);

    // Add simple drag handle
    const dragBar = document.createElement("div");
    dragBar.style.position = "absolute";
    dragBar.style.top = "0";
    dragBar.style.left = "0";
    dragBar.style.width = "100%";
    dragBar.style.height = "20px";
    dragBar.style.cursor = "move";
    dragBar.style.userSelect = "none";
    dragBar.style.background = "transparent"; // completely invisible
    dragBar.style.zIndex = "1";
    wrapper.appendChild(dragBar);

    // Add video to wrapper
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.display = "block";
    wrapper.appendChild(video);

    // Drag logic
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    dragBar.addEventListener("mousedown", (e) => {
        isDragging = true;
        startX = e.clientX - wrapper.offsetLeft;
        startY = e.clientY - wrapper.offsetTop;
        document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        wrapper.style.left = `${e.clientX - startX}px`;
        wrapper.style.top = `${e.clientY - startY}px`;
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
