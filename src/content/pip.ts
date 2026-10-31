// Lazy-loading players (Reddit) don't fetch anything until you interact, and PiP throws until
// metadata has loaded. So offer PiP whenever there's a source, and load it on click.
export function canPip(video: HTMLVideoElement): boolean {
    if (!document.pictureInPictureEnabled || video.disablePictureInPicture) return false;
    return (
        video.readyState >= 1 ||
        !!(video.currentSrc || video.srcObject || video.getAttribute("src") || video.querySelector("source[src]"))
    );
}

export async function togglePip(video: HTMLVideoElement) {
    if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture().catch(() => {});
        return;
    }
    if (video.readyState < 1) {
        video.play().catch(() => {});
        // The click's user activation lasts about 5 seconds, so don't wait longer than that.
        await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 3000);
            video.addEventListener(
                "loadedmetadata",
                () => {
                    clearTimeout(timer);
                    resolve();
                },
                { once: true }
            );
        });
    }
    await video.requestPictureInPicture().catch(() => {});
}
