// The recordings start on a blank page, so loop from data-start instead of using the loop attribute.
document.querySelectorAll("video[data-start]").forEach((video) => {
  const start = parseFloat(video.dataset.start);
  const restart = () => {
    video.currentTime = start;
    video.play().catch(() => {});
  };
  video.addEventListener("loadedmetadata", restart, { once: true });
  video.addEventListener("ended", restart);
});
