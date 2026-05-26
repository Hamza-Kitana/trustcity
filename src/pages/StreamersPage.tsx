import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Radio } from "lucide-react";
import { StreamerLawsApplyBlock } from "@/components/streamers/StreamerLawsApplyBlock";
import ReflectiveCard from "@/components/ReflectiveCard";
import { useStreamersContent } from "@/contexts/StreamersContentContext";
import { useSiteVisibility } from "@/lib/siteVisibility";
import { useStreamersKickLive } from "@/hooks/useStreamersKickLive";
import { useStreamersTikTokLive } from "@/hooks/useStreamersTikTokLive";
import { parseKickSlugFromUrl } from "@/lib/kickChannel";
import { parseTikTokUniqueIdFromUrl } from "@/lib/tiktokChannel";

const StreamersPage = () => {
  const { items } = useStreamersContent();
  const visibility = useSiteVisibility();
  const visibleItems = useMemo(() => items.filter((x) => !x.hidden), [items]);
  const kickLiveMap = useStreamersKickLive(visibleItems);
  const tiktokLiveMap = useStreamersTikTokLive(visibleItems);
  const liveCount = useMemo(() => {
    let n = 0;
    for (const it of visibleItems) {
      if (parseKickSlugFromUrl(it.streamUrl)) {
        if (kickLiveMap[it.id]?.live) n += 1;
      } else if (parseTikTokUniqueIdFromUrl(it.streamUrl)) {
        if (tiktokLiveMap[it.id]?.live) n += 1;
      }
    }
    return n;
  }, [visibleItems, kickLiveMap, tiktokLiveMap]);

  if (!visibility.pages.streamers) return <Navigate to="/" replace />;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />
      <main className="pb-20">
        <section className="relative h-[46vh] min-h-[300px] max-h-[520px] overflow-hidden">
          <img
            src="/trustLogo.png"
            alt="صورة تعبر عن صناع المحتوى"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/placeholder.svg";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/10 to-background/85" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background/55 to-transparent backdrop-blur-sm" />
          <div className="absolute inset-x-0 -bottom-8 h-32 bg-gradient-to-t from-background/90 via-background/60 to-transparent backdrop-blur-sm" />
          <div className="absolute inset-x-0 bottom-8 flex justify-center px-4">
            <h1 className="font-display text-4xl md:text-6xl font-bold text-center drop-shadow-[0_8px_24px_hsl(var(--background)/0.85)]">
              <span className="text-gradient-neon">صنّاع المحتوى</span>
            </h1>
          </div>
        </section>

        <section className="w-full px-4 md:px-8 xl:px-12 mt-10">
          <div className="glass-panel rounded-2xl p-6 md:p-8">
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              بروفايلات <span className="text-gradient-neon">صنّاع المحتوى</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              لكل صانع محتوى بطاقة تعريفية مختصرة مع رابط البث. روابط Kick وTikTok تُحدَّث تلقائياً كل دقيقة تقريباً؛ إن
              كان الصانع مباشراً يظهر تنبيه أخضر وعنوان البث عند توفره.
            </p>

            {liveCount > 0 ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-emerald-900">
                <Radio className="h-5 w-5 shrink-0 animate-pulse" aria-hidden />
                <p className="text-sm font-medium">
                  يوجد الآن <strong>{liveCount}</strong> من صنّاع المحتوى على بث مباشر (Kick أو TikTok).
                </p>
              </div>
            ) : null}

            {visibleItems.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-primary/25 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                لا يوجد صنّاع محتوى معروضين حالياً — سيتم إضافة البطاقات لاحقاً من الإدارة.
              </p>
            ) : (
              <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {visibleItems.map((streamer) => (
                  <ReflectiveCard
                    key={streamer.id}
                    name={streamer.name}
                    role={streamer.role}
                    bio={streamer.bio}
                    image={streamer.image}
                    streamUrl={streamer.streamUrl}
                    kickSlug={parseKickSlugFromUrl(streamer.streamUrl)}
                    kickLive={kickLiveMap[streamer.id]}
                    tiktokUniqueId={parseTikTokUniqueIdFromUrl(streamer.streamUrl)}
                    tiktokLive={tiktokLiveMap[streamer.id]}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <StreamerLawsApplyBlock />
      </main>
      <Footer />
    </div>
  );
};

export default StreamersPage;
