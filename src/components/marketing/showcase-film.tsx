"use client";
import { useRef, useState } from "react";
import { LuPlay } from "react-icons/lu";

/**
 * The VOXI film on the landing page.
 * To publish it: put the video in public/brand/ (e.g. voxi-film.mp4) and set FILM_SRC below.
 * Optional: a still frame for FILM_POSTER (shown before play).
 */
const FILM_SRC: string | null = null; // e.g. "/brand/voxi-film.mp4"
const FILM_POSTER: string | null = null; // e.g. "/brand/voxi-film-poster.webp"

export function ShowcaseFilm() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    if (!FILM_SRC || !ref.current) return;
    setPlaying(true);
    ref.current.play().catch(() => setPlaying(false));
  };

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Glow behind the frame */}
      <div className="pointer-events-none absolute -inset-x-16 -inset-y-10 rounded-[48px] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(124,92,255,0.35),transparent_70%)] blur-2xl" />

      {/* Hairline gradient border */}
      <div className="relative rounded-[28px] bg-gradient-to-b from-white/25 via-white/8 to-white/[0.03] p-px shadow-[0_40px_120px_-40px_rgba(106,68,242,0.9)]">
        <div className="relative aspect-video overflow-hidden rounded-[27px] bg-[#07040f]">
          {FILM_SRC ? (
            <video
              ref={ref}
              src={FILM_SRC}
              poster={FILM_POSTER ?? undefined}
              playsInline
              preload="metadata"
              controls={playing}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,rgba(124,92,255,0.28),transparent_70%)]" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/voxi-orb.webp" alt="" className="absolute top-1/2 left-1/2 w-[52%] -translate-x-1/2 -translate-y-1/2 opacity-90 [mask-image:radial-gradient(closest-side,#000_55%,transparent_100%)]" />
            </>
          )}

          {/* Vignette and frame details */}
          {!playing && (
            <>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_55%,rgba(0,0,0,0.65))]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-5 text-[11px] font-medium tracking-[0.25em] text-white/45 uppercase sm:px-8 sm:pt-7">
                <span>VOXI</span>
                <span>Doha · Qatar</span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-6 pb-5 sm:px-8 sm:pb-7">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.25em] text-white/45 uppercase">The film</p>
                  <p className="mt-1 font-display text-lg font-semibold text-white sm:text-2xl">A day at the gym, run by VOXI</p>
                </div>
                {!FILM_SRC && <span className="hidden text-[11px] font-medium tracking-[0.25em] text-white/45 uppercase sm:block">Premiering soon</span>}
              </div>

              {FILM_SRC && (
                <button
                  type="button"
                  onClick={play}
                  aria-label="Play the VOXI film"
                  className="group absolute top-1/2 left-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition duration-300 hover:scale-105 hover:bg-white/20 sm:h-24 sm:w-24"
                >
                  <span className="absolute inset-0 animate-ping rounded-full border border-white/20 [animation-duration:2.4s]" />
                  <LuPlay className="ml-1 h-7 w-7 fill-white sm:h-8 sm:w-8" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
