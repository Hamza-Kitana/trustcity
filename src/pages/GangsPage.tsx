import { useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Crown, EyeOff, MapPin, Sparkles, UserRound } from "lucide-react";
import { GangsPublicApplySection } from "@/components/gangs/GangsPublicApplySection";
import { useGangsContent } from "@/contexts/GangsContentContext";
import { cn } from "@/lib/utils";
import { parseYoutubeVideoId, scheduleBoostYoutubePlayerQuality, youtubeEmbedUrl } from "@/lib/youtube";
import type { GangCard } from "@/types/gangsSchema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Navigate } from "react-router-dom";
import { useSiteVisibility } from "@/lib/siteVisibility";

function scrollToGang(id: string) {
  const el = document.getElementById(`gang-${id}`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function GodfatherSpotlight() {
  return (
    <section
      id="godfather"
      className="relative scroll-mt-28 overflow-hidden rounded-[2rem] border border-red-500/30 bg-gradient-to-br from-red-950/35 via-background to-rose-950/25 px-5 py-8 shadow-[0_32px_90px_-40px_rgba(0,0,0,0.55)] animate-godfather-glow md:px-10 md:py-11"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(105deg, transparent 40%, rgba(251,113,133,0.15) 50%, transparent 60%)",
          backgroundSize: "200% 100%",
        }}
      />
      <div className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-red-600/20 blur-[90px]" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-rose-600/15 blur-[80px]" />

      <div className="relative grid gap-10 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:items-center md:gap-12">
        <div className="relative mx-auto flex w-full max-w-[220px] justify-center md:mx-0 md:max-w-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-[200px] w-[200px] origin-center rounded-full border border-dashed border-red-500/25 opacity-60 animate-godfather-ring" />
          </div>
          <div className="relative flex h-[180px] w-[180px] items-center justify-center animate-godfather-float">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-600/30 via-transparent to-rose-600/25 blur-xl" />
            <div className="relative flex h-40 w-40 animate-pulse-glow items-center justify-center overflow-hidden rounded-full border-2 border-red-500/50 bg-gradient-to-b from-zinc-900/95 to-zinc-950 shadow-[0_0_40px_rgba(220,38,38,0.35)] ring-4 ring-rose-500/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
              <UserRound className="relative h-20 w-20 text-zinc-600/90 blur-[2.5px]" strokeWidth={1.25} aria-hidden />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1 rounded-full border border-white/10 bg-black/50 px-2 py-1 backdrop-blur-sm">
                <EyeOff className="h-3.5 w-3.5 text-amber-200/90" aria-hidden />
                <span className="font-display text-[10px] tracking-wide text-amber-100/95">هوية مخفية</span>
              </div>
            </div>
            <Crown className="absolute -top-1 left-1/2 h-8 w-8 -translate-x-1/2 text-amber-400/95 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" aria-hidden />
          </div>
        </div>

        <div className="space-y-4 text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-950/40 px-3 py-1 font-display text-[10px] tracking-[0.28em] text-red-200/95">
            السلطة العليا
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            كبير العصابات — <span className="text-gradient-neon">Godfather</span>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            شخصية لا تُعرَف للعلن — صورة مموّهة، واسم لا يُعلَن في الساحة العامة. يجلس فوق هيكل العصابات في TRUST CFW: يوجِّه التوازن بين
            الفصائل، ويُسوّي الخلافات الحادة، ويُقرِّر ما إذا كانت الحدود تُفتح أو تُغلق. قراره{" "}
            <span className="font-semibold text-foreground">نهائي</span> في ما يخص الصراعات الكبرى والعلاقة بين العصابات والإدارة؛ لا يُتوقع أن
            يظهر في كل موقف، لكن حضوره يُشعر به في كل توتر يهدّد الاستقرار.
          </p>
          <p className="border-t border-primary/15 pt-4 text-sm leading-relaxed text-muted-foreground">
            في الرول بلاي: احترم الغموض — لا تفرض اسماً أو وجهاً على اللاعب؛ المهم هو ثقل القرار وهيبة الموقف. أي تمثيل للكبير يمر عبر الإدارة
            والقنوات الرسمية فقط.
          </p>
        </div>
      </div>
    </section>
  );
}

function GangIdentitySection({
  brandColor,
  points,
  tone,
}: {
  brandColor: string;
  points: string[];
  tone: "taken" | "available";
}) {
  const taken = tone === "taken";

  return (
    <div
      className={cn(
        "mt-4 rounded-xl px-4 py-3.5 text-right",
        taken
          ? "border border-amber-500/15 bg-gradient-to-bl from-amber-500/[0.06] to-background/40"
          : "border border-primary/12 bg-muted/20",
      )}
      style={{ borderInlineStart: `3px solid ${brandColor}` }}
    >
      <p className="font-display text-[10px] tracking-[0.22em] text-muted-foreground sm:text-[11px]">نظام وصف العصابة</p>

      <div className="mt-4 flex flex-row-reverse items-center justify-between gap-3 border-b border-border/30 pb-4">
        <div
          className={cn(
            "h-11 w-11 shrink-0 rounded-lg border-2 border-background shadow-md",
            brandColor.replace(/\s/g, "").toUpperCase() === "#FFFFFF" ? "ring-2 ring-neutral-500/45" : "ring-1 ring-black/20",
          )}
          style={{ backgroundColor: brandColor }}
          role="img"
          aria-label={`مربع اللون الرئيسي ${brandColor}`}
        />
        <div className="min-w-0 flex-1 text-right">
          <p className="font-display text-[11px] tracking-wide text-primary/90">اللون الرئيسي</p>
          <p className="mt-0.5 font-mono text-xs text-foreground/90" dir="ltr">
            {brandColor.toUpperCase()}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2.5">
        {points.map((line, i) => (
          <li key={i} className="flex gap-2.5 text-right text-sm leading-snug text-muted-foreground">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full ring-2 ring-background"
              style={{
                backgroundColor: brandColor,
                boxShadow: `0 0 0 1px color-mix(in srgb, ${brandColor} 40%, transparent)`,
              }}
              aria-hidden
            />
            <span className="min-w-0 flex-1">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GangsSideRail({ list }: { list: GangCard[] }) {
  return (
    <nav
      aria-label="تنقّل سريع بين العصابات"
      className="pointer-events-none fixed left-3 top-20 z-[45] hidden md:left-5 md:flex lg:left-8 lg:top-24"
    >
      <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-primary/30 bg-background/90 p-2 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        {list.map((g) => (
          <Tooltip key={g.id} delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => scrollToGang(g.id)}
                className={cn(
                  "relative h-11 w-11 overflow-hidden rounded-xl border border-primary/35 bg-muted/50 transition-all",
                  "hover:border-primary/70 hover:shadow-[0_0_22px_hsl(var(--primary)/0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                )}
              >
                <img src={g.logoImage} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="border-primary/25 bg-popover/95 font-display text-sm font-semibold">
              {g.nameEn ? `${g.name} — ${g.nameEn}` : g.name}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </nav>
  );
}

function GangShowcaseCard({ gang }: { gang: GangCard }) {
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  const isTaken = gang.status === "taken";
  const youtubeId = parseYoutubeVideoId(gang.youtubeVideo);

  return (
    <article
      id={`gang-${gang.id}`}
      className={cn(
        "group relative w-full max-w-none scroll-mt-28 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card/90 via-background/95 to-card/80 sm:rounded-[2rem]",
        "shadow-[0_28px_90px_-30px_hsl(var(--primary)/0.35)] transition-[box-shadow,transform] duration-500 hover:shadow-[0_36px_100px_-28px_hsl(var(--primary)/0.42)]",
      )}
    >
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-secondary/10 blur-[90px]" />

      <div className="relative flex flex-col md:grid md:grid-cols-12 md:gap-0">
        {/* محتوى — على اليمين في الشاشات الكبيرة */}
        <div className="order-2 flex flex-col justify-between gap-5 p-5 sm:p-6 md:order-1 md:col-span-5 lg:col-span-4 md:p-7 lg:p-8">
          <div>
            <div className="flex flex-wrap items-start gap-4">
              <div className="relative shrink-0">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/50 to-secondary/40 opacity-80 blur-sm transition-opacity group-hover:opacity-100" />
                <img
                  src={gang.logoImage}
                  alt={`شعار ${gang.name}`}
                  className="relative h-20 w-20 rounded-2xl border-2 border-primary/35 bg-background object-cover shadow-[0_12px_40px_hsl(var(--primary)/0.25)] sm:h-[5.25rem] sm:w-[5.25rem]"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 font-display text-[10px] tracking-[0.18em] text-primary sm:text-[11px]">
                  {gang.specialty}
                </div>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{gang.name}</h2>
                {gang.nameEn ? (
                  <p className="mt-1 font-latin-display text-sm font-semibold tracking-wide text-muted-foreground">{gang.nameEn}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-primary/15 bg-muted/30 px-3 py-2.5 text-right backdrop-blur-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-display text-[11px] tracking-wide text-primary/90">موقع العصابة</p>
                <p className="mt-0.5 text-sm leading-snug text-foreground sm:text-[15px]">{gang.location}</p>
              </div>
            </div>

            <p className="mt-4 text-right text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {gang.description}
            </p>

            {isTaken ? (
              <div className="relative mt-5 overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-bl from-amber-500/[0.14] via-background/40 to-transparent px-4 py-4 text-right shadow-[inset_0_1px_0_rgba(251,191,36,0.2)] sm:px-5">
                <div className="pointer-events-none absolute inset-y-2.5 start-0 w-[3px] rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600/70" />
                <p className="font-display text-[10px] tracking-[0.24em] text-amber-400/95 sm:text-[11px]">صاحب العصابة</p>
                <p className="mt-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
                  <span className="text-gradient-neon drop-shadow-[0_2px_24px_hsl(var(--primary)/0.35)]">
                    {gang.leaderName?.trim() || "—"}
                  </span>
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">عصابة مأخوذة — غير متاحة حالياً.</p>
              </div>
            ) : null}

            <GangIdentitySection
              brandColor={gang.brandColor}
              points={gang.profilePoints}
              tone={isTaken ? "taken" : "available"}
            />
          </div>

          <div className="border-t border-primary/15 pt-4">
            {isTaken ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2">
                <span className="font-display text-xs tracking-wide text-amber-500/90">حالة: مأخوذة</span>
                <span className="inline-flex items-center rounded-full border border-amber-500/35 bg-background/60 px-2.5 py-0.5 text-[10px] text-muted-foreground">
                  غير متاحة للتقديم حالياً
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2.5">
                <span className="font-display text-xs tracking-wide text-emerald-500/90">حالة: متاحة</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-background/60 px-2.5 py-0.5 text-[10px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-emerald-400" aria-hidden />
                  التقديم عبر طلب فتح عصابة من أسفل الصفحة
                </span>
              </div>
            )}
          </div>
        </div>

        {/* فيديو يوتيوب — على اليسار في الشاشات الكبيرة */}
        <div className="relative order-1 w-full md:order-2 md:col-span-7 lg:col-span-8">
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {youtubeId ? (
              <iframe
                ref={youtubeIframeRef}
                src={youtubeEmbedUrl(youtubeId)}
                title={`فيديو يوتيوب عن ${gang.name}`}
                className="absolute inset-0 h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => scheduleBoostYoutubePlayerQuality(youtubeIframeRef.current)}
              />
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 bg-muted p-8 text-center">
                <p className="text-sm font-medium text-foreground">تعذّر عرض الفيديو</p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  تحقق من حقل <span dir="ltr" className="font-mono text-[11px]">youtubeVideo</span> — ضع معرف الفيديو (11 حرفاً) أو رابط يوتيوب كامل.
                </p>
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-background/85 to-transparent md:h-12" />

          <div
            className={cn(
              "absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border px-3 py-1.5 font-display text-[11px] tracking-wide backdrop-blur-md sm:right-6 sm:top-6",
              isTaken
                ? "border-amber-500/40 bg-background/70 text-amber-200"
                : "border-emerald-500/40 bg-background/70 text-emerald-200",
            )}
          >
            <UserRound className="h-3.5 w-3.5 opacity-90" />
            {isTaken ? "مأخوذة" : "متاحة"}
          </div>
        </div>
      </div>
    </article>
  );
}

const GangsPage = () => {
  const { gangs } = useGangsContent();
  const visibility = useSiteVisibility();
  const visibleGangs = gangs.filter((g) => !g.hidden);
  if (!visibility.pages.gangs) return <Navigate to="/" replace />;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />
      <GangsSideRail list={visibleGangs} />
      <main className="pb-20">
        <section className="relative h-[46vh] min-h-[300px] max-h-[520px] overflow-hidden">
          <img
            src="/trustLogo.png"
            alt="العصابات — TRUST CFW"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/placeholder.svg";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/10 to-background/85" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background/55 to-transparent backdrop-blur-sm" />
          <div className="absolute inset-x-0 -bottom-8 h-32 bg-gradient-to-t from-background/90 via-background/60 to-transparent backdrop-blur-sm" />
          <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center gap-2 px-4 text-center sm:bottom-3 md:bottom-4">
            <p className="font-display text-xs tracking-[0.35em] text-primary/95 drop-shadow-[0_4px_18px_hsl(var(--background)/0.95)]">
              GANG SYSTEM
            </p>
            <h1 className="font-display text-4xl font-bold md:text-6xl drop-shadow-[0_8px_24px_hsl(var(--background)/0.85)]">
              <span className="text-gradient-neon">العصابات</span>
            </h1>
          </div>
        </section>

        <section className="mt-10 w-full px-3 sm:px-4 md:px-8 xl:px-12">
          <GodfatherSpotlight />
        </section>

        <section
          id="gang-list"
          className="mt-10 w-full space-y-8 px-3 sm:px-4 md:mt-12 md:space-y-10 md:px-8 xl:space-y-12 xl:px-12"
        >
          {visibleGangs.map((gang) => (
            <GangShowcaseCard key={gang.id} gang={gang} />
          ))}
        </section>

        <GangsPublicApplySection />
      </main>
      <Footer />
    </div>
  );
};

export default GangsPage;
