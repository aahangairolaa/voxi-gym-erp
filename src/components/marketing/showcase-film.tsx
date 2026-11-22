"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuMaximize, LuPause, LuPlay, LuRotateCcw, LuVolume1, LuVolume2, LuVolumeX } from "react-icons/lu";
import { cn } from "@/lib/utils";

/**
 * The VOXI film on the landing page, with its voiceover.
 * Pressing play starts it with sound (a click lets browsers play audio).
 * Custom controls: play/pause, mute, volume, seek, fullscreen. Keyboard: Space, M, arrows.
 */
const FILM_SRC = "/brand/voxi-film.mp4";
const FILM_POSTER = "/brand/voxi-film-poster.webp";
const VOLUME_KEY = "voxi-film-volume";

const fmt = (s: number) => {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export function ShowcaseFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(25);
  const [chrome, setChrome] = useState(true); // controls visible

  // Remember the last volume the visitor chose (fine if storage is blocked)
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(VOLUME_KEY));
      if (v > 0 && v <= 1) setVolume(v);
    } catch {}
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted]);

  // Pause when the film scrolls out of view
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e && !e.isIntersecting && video.current && !video.current.paused) video.current.pause();
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const wake = useCallback(() => {
    setChrome(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (video.current && !video.current.paused) setChrome(false);
    }, 2600);
  }, []);

  const play = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.ended) v.currentTime = 0;
    v.muted = muted;
    v.volume = volume;
    setStarted(true);
    v.play().catch(() => {
      // Some browsers still refuse sound: play muted and let the visitor unmute
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
    wake();
  }, [muted, volume, wake]);

  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) play();
    else v.pause();
  }, [play]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      if (!next && volume === 0) setVolume(0.6);
      return next;
    });
    wake();
  }, [volume, wake]);

  const changeVolume = (v: number) => {
    setVolume(v);
    setMuted(v === 0);
    try {
      if (v > 0) localStorage.setItem(VOLUME_KEY, String(v));
    } catch {}
    wake();
  };

  const seek = (t: number) => {
    if (video.current) video.current.currentTime = t;
    setTime(t);
    wake();
  };

  const fullscreen = () => {
    const el = frame.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else v?.webkitEnterFullscreen?.(); // iPhone
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      toggle();
    } else if (e.key === "m") toggleMute();
    else if (e.key === "ArrowRight") seek(Math.min(duration, time + 5));
    else if (e.key === "ArrowLeft") seek(Math.max(0, time - 5));
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      changeVolume(Math.min(1, Math.round((volume + 0.1) * 10) / 10));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      changeVolume(Math.max(0, Math.round((volume - 0.1) * 10) / 10));
    }
  };

  const level = muted ? 0 : volume;
  const VolumeIcon = level === 0 ? LuVolumeX : level < 0.5 ? LuVolume1 : LuVolume2;
  const showChrome = started && (chrome || !playing);
  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Glow behind the frame */}
      <div className="pointer-events-none absolute -inset-x-16 -inset-y-10 rounded-[48px] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(124,92,255,0.35),transparent_70%)] blur-2xl" />

      {/* Hairline gradient border */}
      <div className="relative rounded-[28px] bg-gradient-to-b from-white/25 via-white/8 to-white/[0.03] p-px shadow-[0_40px_120px_-40px_rgba(106,68,242,0.9)]">
        <div
          ref={frame}
          tabIndex={0}
          role="region"
          aria-label="VOXI film"
          onKeyDown={onKey}
          onMouseMove={wake}
          onTouchStart={wake}
          onMouseLeave={() => playing && setChrome(false)}
          className={cn(
            "group/film relative aspect-video overflow-hidden rounded-[27px] bg-[#07040f] outline-none focus-visible:ring-2 focus-visible:ring-white/40 [&:fullscreen]:rounded-none",
            started && playing && !chrome && "cursor-none",
          )}
        >
          <video
            ref={video}
            src={FILM_SRC}
            poster={FILM_POSTER}
            playsInline
            preload="metadata"
            onClick={started ? toggle : play}
            onPlay={() => {
              setPlaying(true);
              setEnded(false);
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setEnded(true);
              setChrome(true);
            }}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 25)}
            onVolumeChange={(e) => {
              // Follow the phone's own controls too (e.g. iPhone fullscreen player)
              setMuted(e.currentTarget.muted);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer object-cover"
          />

          {/* Before the first play: soft vignette and a "Play with sound" call to action */}
          {!started && (
            <>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_60%,rgba(0,0,0,0.6))]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-5 text-[11px] font-medium tracking-[0.25em] text-white/45 uppercase sm:px-8 sm:pt-7">
                <span>The film</span>
                <span>0:{String(Math.round(duration)).padStart(2, "0")}</span>
              </div>
              <button
                type="button"
                onClick={play}
                aria-label="Play the VOXI film with sound"
                className="group absolute top-[19%] left-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-full border border-white/20 bg-white/10 py-1.5 pr-4 pl-1.5 text-xs font-semibold whitespace-nowrap text-white backdrop-blur-xl transition duration-300 hover:scale-[1.03] hover:bg-white/20 sm:gap-3 sm:py-2 sm:pr-5 sm:pl-2 sm:text-sm"
              >
                <span className="relative grid h-8 w-8 place-items-center rounded-full bg-white text-[#1a1033] sm:h-10 sm:w-10">
                  <span className="absolute inset-0 animate-ping rounded-full border border-white/40 [animation-duration:2.4s]" />
                  <LuPlay className="ml-0.5 h-4 w-4 fill-current" />
                </span>
                Play with sound
                <LuVolume2 className="h-4 w-4 text-white/70" />
              </button>
            </>
          )}

          {/* Replay */}
          {ended && (
            <button
              type="button"
              onClick={play}
              aria-label="Watch again"
              className="absolute top-1/2 left-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/40 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-black/60"
            >
              <LuRotateCcw className="h-4 w-4" /> Watch again
            </button>
          )}

          {/* Control bar */}
          {started && (
            <div
              className={cn(
                "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pt-10 pb-3 transition-opacity duration-300 sm:px-5 sm:pb-4",
                showChrome ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {/* Progress */}
              <input
                type="range"
                aria-label="Seek"
                min={0}
                max={duration}
                step={0.1}
                value={time}
                onChange={(e) => seek(Number(e.target.value))}
                className="film-range mb-2 block w-full"
                style={{ "--fill": `${pct}%` } as React.CSSProperties}
              />
              <div className="flex items-center gap-1 text-white sm:gap-2">
                <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/15">
                  {playing ? <LuPause className="h-[18px] w-[18px] fill-current" /> : <LuPlay className="ml-0.5 h-[18px] w-[18px] fill-current" />}
                </button>

                {/* Volume: mute button + slider */}
                <div className="group/vol flex items-center">
                  <button type="button" onClick={toggleMute} aria-label={level === 0 ? "Unmute" : "Mute"} aria-pressed={muted} className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/15">
                    <VolumeIcon className="h-[18px] w-[18px]" />
                  </button>
                  <input
                    type="range"
                    aria-label="Volume"
                    min={0}
                    max={1}
                    step={0.05}
                    value={level}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    className="film-range w-16 sm:w-24"
                    style={{ "--fill": `${level * 100}%` } as React.CSSProperties}
                  />
                </div>

                <span className="ml-2 text-xs font-medium text-white/75 tabular-nums">
                  {fmt(time)} <span className="text-white/40">/ {fmt(duration)}</span>
                </span>

                <span className="flex-1" />
                <button type="button" onClick={fullscreen} aria-label="Full screen" className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/15">
                  <LuMaximize className="h-[17px] w-[17px]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
