import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { KickChannelLiveInfo } from "@/lib/kickChannel";
import type { TikTokChannelLiveInfo } from "@/lib/tiktokChannel";
import { ExternalLink } from "lucide-react";
import "./ReflectiveCard.css";

type ReflectiveCardProps = {
  name: string;
  role: string;
  bio: string;
  image: string;
  streamUrl: string;
  featured?: boolean;
  /** إن وُجد، قناة Kick لعرض الحالة والمعاينة */
  kickSlug?: string | null;
  /** حالة Kick من الـ API؛ غير معرّف = لم يكتمل أول طلب بعد */
  kickLive?: KickChannelLiveInfo;
  /** اسم المستخدم على TikTok من الرابط */
  tiktokUniqueId?: string | null;
  /** حالة TikTok من صفحة الملف؛ غير معرّف = لم يكتمل أول طلب بعد */
  tiktokLive?: TikTokChannelLiveInfo;
};

const ReflectiveCard = ({
  name,
  role,
  bio,
  image,
  streamUrl,
  featured = false,
  kickSlug,
  kickLive,
  tiktokUniqueId,
  tiktokLive,
}: ReflectiveCardProps) => {
  const isKick = Boolean(kickSlug);
  const isTikTok = Boolean(tiktokUniqueId) && !isKick;
  const loadingKick = isKick && kickLive === undefined;
  const loadingTikTok = isTikTok && tiktokLive === undefined;
  const loadingLive = loadingKick || loadingTikTok;

  const kickFetchOk = kickLive?.fetchOk === true;
  const tiktokFetchOk = tiktokLive?.fetchOk === true;

  const isLiveKick = isKick && kickFetchOk && kickLive?.live === true;
  const isLiveTikTok =
    isTikTok && tiktokFetchOk && tiktokLive?.live === true && Boolean(tiktokLive?.roomId);
  const isLive = isLiveKick || isLiveTikTok;

  const isOfflineKick = isKick && kickFetchOk && kickLive?.live === false;
  const isOfflineTikTok = isTikTok && tiktokFetchOk && tiktokLive?.live === false;
  const isOffline = isOfflineKick || isOfflineTikTok;

  const statusRow = (() => {
    if (!isKick && !isTikTok) return null;
    if (loadingLive) {
      return (
        <div className="reflective-card__status-pill reflective-card__status-pill--loading" aria-live="polite">
          <span className="reflective-card__status-loading-dot" />
          جاري التحقق من البث…
        </div>
      );
    }
    if (isLive) {
      return (
        <div className="reflective-card__live-pill" aria-live="polite">
          <span className="reflective-card__live-dot" />
          <span className="reflective-card__live-text">{isLiveKick ? "مباشر على Kick" : "مباشر على TikTok"}</span>
        </div>
      );
    }
    if (isOffline) {
      return (
        <div className="reflective-card__offline-pill" aria-live="polite">
          <span className="reflective-card__offline-dot" />
          أوفلاين
        </div>
      );
    }
    return null;
  })();

  const sessionTitle = isLiveKick ? kickLive?.sessionTitle : isLiveTikTok ? tiktokLive?.sessionTitle : undefined;

  const article = (
    <article
      className={`reflective-card ${featured ? "reflective-card--featured" : "reflective-card--lite"} ${isLive ? "reflective-card--live" : ""} ${isOffline ? "reflective-card--offline" : ""}`}
    >
      <img src={image} alt={name} className="reflective-card__bg" loading="lazy" decoding="async" />
      <div className="reflective-card__overlay" />

      <div className="reflective-card__content">
        <div className="reflective-card__body">
          {statusRow}
          <div
            className={`reflective-card__avatar-wrap ${isLive ? "reflective-card__avatar-wrap--live" : ""} ${isOffline ? "reflective-card__avatar-wrap--offline" : ""}`}
          >
            <img src={image} alt={name} className="reflective-card__avatar" loading="lazy" decoding="async" />
          </div>
          <p className="reflective-card__role">{role}</p>
          <h3 className="reflective-card__name">{name}</h3>
          {isLive && sessionTitle ? (
            <p className="reflective-card__live-title" title={sessionTitle}>
              {sessionTitle}
            </p>
          ) : null}
          <p className="reflective-card__bio">{bio}</p>
          {isLive ? (
            <p className="reflective-card__hover-hint">مرّر المؤشر لمعاينة البث</p>
          ) : null}
        </div>

        <footer className="reflective-card__footer">
          <Button asChild className="w-full bg-gradient-neon text-primary-foreground font-display tracking-widest">
            <a href={streamUrl} target="_blank" rel="noreferrer">
              {isLive ? "شاهد البث المباشر" : "رابط البث"}
            </a>
          </Button>
        </footer>
      </div>
    </article>
  );

  if (isLiveKick && kickSlug && kickFetchOk) {
    return (
      <HoverCard openDelay={280} closeDelay={200}>
        <HoverCardTrigger asChild>
          <div className="group h-full rounded-[22px] outline-none transition-[transform,box-shadow] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            {article}
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="center"
          sideOffset={10}
          className="z-[110] w-[min(94vw,440px)] border-rose-200 bg-[#0f0f12] p-0 text-right shadow-xl data-[state=open]:animate-in"
          dir="rtl"
        >
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-xs font-medium text-white/90">{name}</p>
            {kickLive?.sessionTitle ? (
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/70">{kickLive.sessionTitle}</p>
            ) : (
              <p className="mt-1 text-[11px] text-emerald-400/90">بث مباشر على Kick</p>
            )}
          </div>
          <div className="relative aspect-video w-full bg-black">
            <iframe
              title={`Kick — ${name}`}
              src={`https://player.kick.com/${kickSlug}`}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-3 py-2">
            <a
              href={streamUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-300 underline-offset-4 hover:text-white hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              فتح على Kick
            </a>
            <span className="text-[10px] text-white/45">معاينة عند تمرير المؤشر على البطاقة</span>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  if (isLiveTikTok && tiktokLive?.roomId && tiktokFetchOk) {
    const embedSrc = `https://www.tiktok.com/player/v1/embed/live?room_id=${encodeURIComponent(tiktokLive.roomId)}`;
    return (
      <HoverCard openDelay={280} closeDelay={200}>
        <HoverCardTrigger asChild>
          <div className="group h-full rounded-[22px] outline-none transition-[transform,box-shadow] hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            {article}
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="center"
          sideOffset={10}
          className="z-[110] w-[min(94vw,440px)] border-rose-200 bg-[#0f0f12] p-0 text-right shadow-xl data-[state=open]:animate-in"
          dir="rtl"
        >
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-xs font-medium text-white/90">{name}</p>
            {tiktokLive.sessionTitle ? (
              <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/70">{tiktokLive.sessionTitle}</p>
            ) : (
              <p className="mt-1 text-[11px] text-emerald-400/90">بث مباشر على TikTok</p>
            )}
          </div>
          <div className="relative aspect-video w-full bg-black">
            <iframe
              title={`TikTok — ${name}`}
              src={embedSrc}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-3 py-2">
            <a
              href={streamUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-300 underline-offset-4 hover:text-white hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              فتح على TikTok
            </a>
            <span className="text-[10px] text-white/45">معاينة عند تمرير المؤشر على البطاقة</span>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return article;
};

export default ReflectiveCard;
