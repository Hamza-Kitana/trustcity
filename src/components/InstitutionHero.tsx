import type { ReactNode } from "react";

export type InstitutionHeroProps = {
  /** خط ثانٍ باللاتينية تحت «المؤسسات» (اختياري)، مثل MINISTRY OF JUSTICE أو POLICE DEPARTMENT */
  badgeEn?: string;
  /** العنوان الرئيسي في البطل */
  title: ReactNode;
  alt?: string;
};

/**
 * بطل موحّد لصفحات المؤسسات — نفس هيكل صفحة القوانين وصنّاع المحتوى (GIF + تدرّجات + «المؤسسات» أولاً).
 */
const InstitutionHero = ({ badgeEn, title, alt = "TRUST CFW" }: InstitutionHeroProps) => {
  return (
    <section className="relative h-[46vh] min-h-[300px] max-h-[520px] overflow-hidden">
      <img
        src="/trustLogo.png"
        alt={alt}
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
          المؤسسات
        </p>
        {badgeEn ? (
          <p className="font-display text-[10px] tracking-[0.28em] text-primary/85 drop-shadow-[0_4px_18px_hsl(var(--background)/0.95)] sm:text-xs sm:tracking-[0.32em]">
            {badgeEn}
          </p>
        ) : null}
        <h1 className="font-display text-4xl font-bold md:text-6xl drop-shadow-[0_8px_24px_hsl(var(--background)/0.85)]">
          {title}
        </h1>
      </div>
    </section>
  );
};

export default InstitutionHero;
