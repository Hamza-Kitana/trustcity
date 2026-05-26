import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { boostYoutubePlayerQuality } from "@/lib/youtube";

const YOUTUBE_VIDEO_ID = "i2LTjSqxTxY";

export const getYoutubeEmbedUrl = () =>
  `https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&mute=0&loop=1&playlist=${YOUTUBE_VIDEO_ID}&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&origin=${typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""}`;

export type HeroBackgroundVideoContextValue = {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  volume: number;
  muted: boolean;
  handleVolumeChange: (nextVolume: number) => void;
  handleMuteToggle: () => void;
  onIframeLoad: () => void;
};

const HeroBackgroundVideoContext = createContext<HeroBackgroundVideoContextValue | null>(null);

/** تأخيرات إعادة طلب التشغيل — المشغّل قد لا يكون جاهزاً فور تحميل الـ iframe */
const PLAY_RETRY_MS = [0, 200, 500, 900, 1600, 2800, 4500] as const;

export function HeroBackgroundVideoProvider({ children }: { children: ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playRetryTimersRef = useRef<number[]>([]);
  /** الصوت مفعّل افتراضياً عند فتح الموقع */
  const soundUnlockedRef = useRef(true);
  const [volume, setVolume] = useState(50);
  const [muted, setMuted] = useState(false);

  const postPlayerCommand = useCallback((func: string, args?: unknown[]) => {
    if (!iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func,
        args: args ?? [],
      }),
      "*",
    );
  }, []);

  const clearPlayRetries = useCallback(() => {
    for (const id of playRetryTimersRef.current) window.clearTimeout(id);
    playRetryTimersRef.current = [];
  }, []);

  const pushAutoplay = useCallback(() => {
    postPlayerCommand("playVideo");
    postPlayerCommand("setVolume", [volume]);
    if (muted || volume === 0) {
      postPlayerCommand("mute");
    } else {
      postPlayerCommand("unMute");
      postPlayerCommand("setVolume", [volume]);
    }
    boostYoutubePlayerQuality(iframeRef.current?.contentWindow);
  }, [muted, volume, postPlayerCommand]);

  const scheduleAutoplay = useCallback(() => {
    clearPlayRetries();
    playRetryTimersRef.current = PLAY_RETRY_MS.map((ms) => window.setTimeout(pushAutoplay, ms));
  }, [clearPlayRetries, pushAutoplay]);

  useEffect(() => {
    scheduleAutoplay();
    return clearPlayRetries;
  }, [scheduleAutoplay, clearPlayRetries]);

  /** بعض المتصفحات تمنع الصوت التلقائي حتى أول تفاعل — نُعيد تفعيل الصوت عند أول نقر/لمس */
  useEffect(() => {
    const unlockSound = () => {
      soundUnlockedRef.current = true;
      if (muted || volume === 0) return;
      postPlayerCommand("playVideo");
      postPlayerCommand("setVolume", [volume]);
      postPlayerCommand("unMute");
    };
    window.addEventListener("pointerdown", unlockSound, { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", unlockSound, { capture: true });
  }, [muted, volume, postPlayerCommand]);

  const handleVolumeChange = useCallback(
    (nextVolume: number) => {
      soundUnlockedRef.current = true;
      setVolume(nextVolume);
      postPlayerCommand("playVideo");
      postPlayerCommand("setVolume", [nextVolume]);

      if (nextVolume === 0) {
        setMuted(true);
        postPlayerCommand("mute");
        return;
      }

      setMuted(false);
      postPlayerCommand("unMute");
    },
    [postPlayerCommand],
  );

  const handleMuteToggle = useCallback(() => {
    soundUnlockedRef.current = true;
    setMuted((prev) => {
      const next = !prev;
      postPlayerCommand("playVideo");
      postPlayerCommand(next ? "mute" : "unMute");
      return next;
    });
  }, [postPlayerCommand]);

  const onIframeLoad = useCallback(() => {
    scheduleAutoplay();
    window.setTimeout(() => boostYoutubePlayerQuality(iframeRef.current?.contentWindow), 800);
    window.setTimeout(() => boostYoutubePlayerQuality(iframeRef.current?.contentWindow), 2200);
  }, [scheduleAutoplay]);

  const value = useMemo(
    () => ({
      iframeRef,
      volume,
      muted,
      handleVolumeChange,
      handleMuteToggle,
      onIframeLoad,
    }),
    [volume, muted, handleVolumeChange, handleMuteToggle, onIframeLoad],
  );

  return (
    <HeroBackgroundVideoContext.Provider value={value}>{children}</HeroBackgroundVideoContext.Provider>
  );
}

export function useHeroBackgroundVideo(): HeroBackgroundVideoContextValue {
  const ctx = useContext(HeroBackgroundVideoContext);
  if (!ctx) {
    throw new Error("useHeroBackgroundVideo must be used within HeroBackgroundVideoProvider");
  }
  return ctx;
}

export function useOptionalHeroBackgroundVideo(): HeroBackgroundVideoContextValue | null {
  return useContext(HeroBackgroundVideoContext);
}
