import { downloadUrl, downloadVideo } from "./download";
import { icons } from "./icons";
import { canPip, togglePip } from "./pip";

const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.5, 0.75];
const IDLE_MS = 2500;

const CSS = `
    .controls { position: absolute; left: 0; right: 0; bottom: 0; padding: 4px 6px 6px; box-sizing: border-box;
        background: var(--ctl-bg); color: var(--ctl-fg); border-radius: 0 0 10px 10px; pointer-events: auto;
        container-type: inline-size; transition: opacity .2s ease; cursor: default; }
    .win.idle .controls { opacity: 0; pointer-events: none; }
    .seek { display: block; width: 100%; margin: 0 0 2px; height: 14px; accent-color: var(--accent); cursor: pointer; }
    .row { display: flex; align-items: center; gap: 2px; }
    .spacer { flex: 1; }
    .time { padding: 0 6px; font-variant-numeric: tabular-nums; white-space: nowrap; color: var(--ctl-fg); }
    .volume { width: 64px; accent-color: var(--accent); cursor: pointer; }
    .speed { width: auto; padding: 0 6px; font-weight: 600; font-size: 11px; }
    .on { color: var(--accent); }
    .live { padding: 0 6px; font-weight: 600; color: #ef4444; }
    @container (max-width: 360px) { .volume, .speed { display: none; } }
    @container (max-width: 280px) { .time, .loop { display: none; } }`;

function fmt(s: number): string {
    if (!Number.isFinite(s)) return "0:00";
    const t = Math.floor(s);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const sec = String(t % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function buildControls(video: HTMLVideoElement, win: HTMLElement, originalInView: () => boolean) {
    const abort = new AbortController();
    const opts = { signal: abort.signal };
    const canDownload = !!downloadUrl(video);

    const style = document.createElement("style");
    style.textContent = CSS;
    const el = document.createElement("div");
    el.className = "controls";
    el.innerHTML = `
        <input class="seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Seek">
        <div class="row">
            <button class="play" aria-label="Play or pause"></button>
            <button class="mute" aria-label="Mute"></button>
            <input class="volume" type="range" min="0" max="1" step="0.01" aria-label="Volume">
            <span class="time"></span>
            <span class="spacer"></span>
            <button class="speed" title="Playback speed"></button>
            <button class="loop" title="Loop" aria-label="Loop">${icons.loop}</button>
            ${canPip(video) ? `<button class="pip" title="Picture in picture" aria-label="Picture in picture">${icons.pip}</button>` : ""}
            ${canDownload ? `<button class="dl" title="Download" aria-label="Download">${icons.download}</button>` : ""}
            <button class="fs" title="Fullscreen" aria-label="Fullscreen">${icons.fullscreen}</button>
        </div>`;
    win.append(style, el);

    const $ = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel)!;
    const seek = $<HTMLInputElement>(".seek");
    const play = $(".play");
    const mute = $(".mute");
    const volume = $<HTMLInputElement>(".volume");
    const time = $(".time");
    const speed = $(".speed");
    const loop = $(".loop");

    let lastUserAction = 0;
    const togglePlay = () => {
        lastUserAction = performance.now();
        if (video.paused) video.play().catch(() => {});
        else video.pause();
    };
    let seeking = false;

    // X loops short clips itself (on `ended` it seeks to 0 and plays) instead of setting `loop`.
    // Once we see that happen we show loop as on, and turning it off blocks the site's handler.
    let siteLoops = false;
    let loopOff = false;
    let endedAt = -Infinity;
    const isLooping = () => video.loop || (siteLoops && !loopOff);
    video.addEventListener("ended", () => (endedAt = performance.now()), opts);
    video.addEventListener(
        "play",
        () => {
            if (!siteLoops && performance.now() - endedAt < 500 && video.currentTime < 1) {
                siteLoops = true;
                render();
            }
        },
        opts
    );
    // Capture on the document runs before the site's own listeners on the video.
    document.addEventListener(
        "ended",
        (e) => {
            if (e.target === video && siteLoops && loopOff) e.stopImmediatePropagation();
        },
        { capture: true, signal: abort.signal }
    );

    // Feeds pause videos whose post scrolls out of view, which defeats the point of popping out.
    video.addEventListener(
        "pause",
        () => {
            if (video.ended || performance.now() - lastUserAction < 1000 || originalInView()) return;
            video.play().catch(() => {});
        },
        opts
    );

    function render() {
        play.innerHTML = video.paused ? icons.play : icons.pause;
        mute.innerHTML = video.muted || video.volume === 0 ? icons.muted : icons.volume;
        volume.value = String(video.muted ? 0 : video.volume);
        speed.textContent = `${video.playbackRate}x`;
        loop.classList.toggle("on", isLooping());
        renderTime();
    }

    function renderTime() {
        const live = video.duration === Infinity;
        seek.style.visibility = live || !Number.isFinite(video.duration) ? "hidden" : "visible";
        if (live) {
            time.innerHTML = `<span class="live">LIVE</span>`;
            return;
        }
        time.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
        if (!seeking && video.duration > 0) seek.value = String((video.currentTime / video.duration) * 1000);
    }

    play.onclick = togglePlay;
    mute.onclick = () => {
        if (video.muted || video.volume === 0) {
            video.muted = false;
            if (video.volume === 0) video.volume = 0.5;
        } else {
            video.muted = true;
        }
    };
    volume.oninput = () => {
        const v = parseFloat(volume.value);
        video.volume = v;
        video.muted = v === 0;
    };
    seek.oninput = () => {
        seeking = true;
        if (video.duration > 0) video.currentTime = (parseFloat(seek.value) / 1000) * video.duration;
    };
    seek.onchange = () => (seeking = false);
    speed.onclick = () => {
        const i = SPEEDS.indexOf(video.playbackRate);
        video.playbackRate = SPEEDS[(i + 1) % SPEEDS.length];
    };
    loop.onclick = () => {
        if (isLooping()) {
            video.loop = false;
            loopOff = true;
        } else {
            loopOff = false;
            if (!siteLoops) video.loop = true;
        }
        render();
    };
    el.querySelector<HTMLElement>(".pip")?.addEventListener("click", () => {
        lastUserAction = performance.now();
        togglePip(video);
    });
    el.querySelector<HTMLElement>(".dl")?.addEventListener("click", () => downloadVideo(video));
    $(".fs").onclick = () => video.requestFullscreen().catch(() => {});

    for (const ev of ["play", "pause", "volumechange", "ratechange", "loadedmetadata", "durationchange"]) {
        video.addEventListener(ev, render, opts);
    }
    video.addEventListener("timeupdate", renderTime, opts);
    // Sites like X turn looping on after the player loads, and `loop` has no change event.
    const loopObserver = new MutationObserver(render);
    loopObserver.observe(video, { attributes: true, attributeFilter: ["loop"] });
    video.addEventListener("play", poke, opts);
    video.addEventListener("pause", poke, opts);

    let idleTimer = 0;
    function poke() {
        win.classList.remove("idle");
        clearTimeout(idleTimer);
        idleTimer = window.setTimeout(() => {
            if (!video.paused && !el.matches(":hover")) win.classList.add("idle");
        }, IDLE_MS);
    }
    win.addEventListener("pointermove", poke, opts);
    win.addEventListener("pointerdown", poke, opts);

    render();
    poke();

    return {
        togglePlay,
        destroy() {
            abort.abort();
            loopObserver.disconnect();
            clearTimeout(idleTimer);
        },
    };
}
