import { useCallback, useEffect, useRef, useState } from "react";

/** Audio playback controller. Falls back to a simulated clock when no audio source is available. */
export function usePlayer(url: string | undefined, duration: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!url) return;
    const a = new Audio(url);
    audioRef.current = a;
    const onTime = () => setCurrent(a.currentTime);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      audioRef.current = null;
    };
  }, [url]);

  // simulated clock
  useEffect(() => {
    if (url || !playing) return;
    const t = setInterval(() => {
      setCurrent((c) => {
        if (c + 0.25 >= duration) {
          setPlaying(false);
          return duration;
        }
        return c + 0.25;
      });
    }, 250);
    return () => clearInterval(t);
  }, [url, playing, duration]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      if (a.paused) {
        void a.play();
        setPlaying(true);
      } else {
        a.pause();
        setPlaying(false);
      }
    } else {
      setPlaying((p) => {
        if (!p) setCurrent((c) => (c >= duration ? 0 : c));
        return !p;
      });
    }
  }, [duration]);

  const seek = useCallback(
    (t: number, autoplay = false) => {
      const clamped = Math.max(0, Math.min(duration, t));
      setCurrent(clamped);
      const a = audioRef.current;
      if (a) {
        a.currentTime = clamped;
        if (autoplay) {
          void a.play();
          setPlaying(true);
        }
      } else if (autoplay) setPlaying(true);
    },
    [duration],
  );

  return { current, playing, toggle, seek, hasAudio: !!url, duration };
}

export type Player = ReturnType<typeof usePlayer>;
