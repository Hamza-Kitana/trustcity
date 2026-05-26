import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstitutionHero from "@/components/InstitutionHero";
import { LawIcon } from "@/components/laws/lawIcons";
import { LawsPenaltiesSection } from "@/components/laws/LawsPenaltiesSection";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLawsContent } from "@/contexts/LawsContentContext";
import { sectionItemCount } from "@/lib/lawsUtils";
import { cn } from "@/lib/utils";
import type { LawTabSection } from "@/types/lawsSchema";
import { useSiteVisibility } from "@/lib/siteVisibility";

type RuleVariant = "primary" | "secondary" | "accent" | "magenta";

const variantStyles: Record<
  RuleVariant,
  { border: string; badge: string; line: string; glow: string; orb: string; inset: string }
> = {
  primary: {
    border: "border-primary/20 hover:border-primary/45",
    badge:
      "bg-gradient-to-br from-primary/25 to-primary/10 text-primary ring-1 ring-primary/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_28px_hsl(var(--primary)/0.18)]",
    line: "from-primary via-secondary/70 to-transparent",
    glow: "hover:shadow-[0_24px_56px_-16px_hsl(var(--primary)/0.22)] hover:-translate-y-1.5",
    orb: "bg-primary/25",
    inset: "ring-white/[0.06]",
  },
  secondary: {
    border: "border-secondary/20 hover:border-secondary/45",
    badge:
      "bg-gradient-to-br from-secondary/25 to-secondary/10 text-secondary ring-1 ring-secondary/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_28px_hsl(var(--secondary)/0.18)]",
    line: "from-secondary via-primary/55 to-transparent",
    glow: "hover:shadow-[0_24px_56px_-16px_hsl(var(--secondary)/0.2)] hover:-translate-y-1.5",
    orb: "bg-secondary/22",
    inset: "ring-white/[0.06]",
  },
  accent: {
    border: "border-accent/20 hover:border-accent/45",
    badge:
      "bg-gradient-to-br from-accent/25 to-accent/10 text-accent ring-1 ring-accent/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_28px_hsl(var(--accent)/0.18)]",
    line: "from-accent via-primary/45 to-transparent",
    glow: "hover:shadow-[0_24px_56px_-16px_hsl(var(--accent)/0.18)] hover:-translate-y-1.5",
    orb: "bg-accent/20",
    inset: "ring-white/[0.06]",
  },
  magenta: {
    border: "border-primary/18 hover:border-secondary/42",
    badge:
      "bg-gradient-to-br from-primary/35 via-secondary/20 to-primary/15 text-foreground ring-1 ring-primary/28 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_32px_hsl(var(--secondary)/0.15)]",
    line: "from-secondary via-primary/90 to-secondary/60",
    glow: "hover:shadow-[0_24px_52px_-14px_hsl(var(--secondary)/0.2)] hover:-translate-y-1.5",
    orb: "bg-secondary/18",
    inset: "ring-white/[0.06]",
  },
};

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 380, damping: 28 },
  },
};

type RuleItem = { id: number; title: string; description: string };

function RuleCard({
  rule,
  variant,
  reduceMotion,
}: {
  rule: RuleItem;
  variant: RuleVariant;
  reduceMotion: boolean | null;
}) {
  const v = variantStyles[variant];
  return (
    <motion.article
      layout={!reduceMotion}
      variants={reduceMotion ? undefined : itemVariants}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-gradient-to-br from-card/95 via-card/75 to-muted/25 p-6 shadow-[0_8px_40px_-18px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-500 md:p-7",
        "ring-1 ring-inset",
        v.inset,
        v.border,
        v.glow,
        "motion-reduce:transform-none motion-reduce:hover:translate-y-0",
      )}
      style={{ contentVisibility: "auto" }}
    >
      {/* وهج خلفي خفيف يتبع نوع القسم */}
      <div
        className={cn(
          "pointer-events-none absolute -left-24 top-0 h-52 w-52 rounded-full blur-3xl transition-opacity duration-700 group-hover:opacity-100 md:h-64 md:w-64",
          v.orb,
          "opacity-55",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute -bottom-20 end-0 h-44 w-44 rounded-full blur-3xl transition-opacity duration-700 group-hover:opacity-90",
          variant === "magenta" ? "bg-primary/15" : "bg-secondary/12",
          "opacity-40",
        )}
      />

      {/* شريط علوي */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-4 top-0 h-[3px] rounded-full bg-gradient-to-l opacity-95 shadow-[0_0_20px_hsl(var(--primary)/0.35)] transition-[opacity,transform] duration-500 group-hover:opacity-100 group-hover:shadow-[0_0_28px_hsl(var(--primary)/0.45)]",
          v.line,
        )}
      />

      <div className="relative flex flex-1 flex-col gap-5 sm:flex-row sm:items-stretch sm:gap-6">
        <div className="flex shrink-0 justify-end sm:block">
          <span
            className={cn(
              "inline-flex h-14 min-h-14 min-w-14 items-center justify-center rounded-2xl font-latin-display text-base font-bold tabular-nums tracking-tight transition-transform duration-300 group-hover:scale-[1.03] md:h-[3.75rem] md:min-w-[3.75rem] md:text-lg",
              v.badge,
            )}
          >
            {String(rule.id).padStart(2, "0")}
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-3 text-right">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full bg-muted/45 px-3 py-1 font-display text-[11px] font-medium text-muted-foreground ring-1 ring-border/35">
              مادة
            </span>
          </div>
          <h4 className="font-display text-xl font-bold leading-snug tracking-tight text-foreground md:text-[1.35rem]">
            {rule.title}
          </h4>
          <p className="text-[0.9375rem] leading-[1.75] text-muted-foreground md:text-base">{rule.description}</p>
        </div>
      </div>

      {/* خط سفلي يظهر عند المرور */}
      <div className="pointer-events-none relative mt-6 h-px w-full bg-gradient-to-l from-transparent via-primary/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* زوايا زخرفية ناعمة */}
      <div className="pointer-events-none absolute bottom-2 start-2 h-6 w-6 rounded-es-lg border-b border-s border-primary/25 opacity-50 transition-opacity duration-500 group-hover:border-primary/40 group-hover:opacity-80" />
      <div className="pointer-events-none absolute bottom-2 end-2 h-6 w-6 rounded-ee-lg border-b border-e border-primary/25 opacity-50 transition-opacity duration-500 group-hover:border-primary/40 group-hover:opacity-80" />
    </motion.article>
  );
}

function RulesGrid({
  rules,
  variant,
  query,
  reduceMotion,
}: {
  rules: RuleItem[];
  variant: RuleVariant;
  query: string;
  reduceMotion: boolean | null;
}) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter(
      (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    );
  }, [rules, query]);

  if (filtered.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-primary/25 bg-gradient-to-br from-muted/30 via-card/40 to-primary/[0.06] px-6 py-20 text-center shadow-inner backdrop-blur-sm">
        <Search className="mx-auto mb-4 h-10 w-10 text-primary/40" aria-hidden />
        <p className="font-display text-base font-semibold text-foreground">لا توجد نتائج مطابقة</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">جرّب كلمة أخرى أو امسح البحث للعودة إلى كل المواد.</p>
      </div>
    );
  }

  if (reduceMotion) {
    return (
      <div
        key={query + variant}
        dir="rtl"
        className="grid auto-rows-fr gap-5 [direction:rtl] sm:grid-cols-2 lg:gap-6 xl:grid-cols-3 xl:gap-7"
      >
        {filtered.map((rule) => (
          <RuleCard key={`${rule.id}-${rule.title}`} rule={rule} variant={variant} reduceMotion={reduceMotion} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      key={query + variant + rules.map((r) => r.id).join("-")}
      dir="rtl"
      className="grid auto-rows-fr gap-5 [direction:rtl] sm:grid-cols-2 lg:gap-6 xl:grid-cols-3 xl:gap-7"
      variants={listVariants}
      initial="hidden"
      animate="show"
    >
      {filtered.map((rule) => (
        <RuleCard key={`${rule.id}-${rule.title}`} rule={rule} variant={variant} reduceMotion={reduceMotion} />
      ))}
    </motion.div>
  );
}

/** حاوية المحتوى — امتداد أفقي أوضح (مثل صفحة من نحن) */
const PAGE_GUTTER =
  "mx-auto w-full max-w-[min(100%,92rem)] px-4 sm:px-6 md:px-10 lg:px-14 xl:px-16";

function SectionIntro({
  title,
  subtitle,
  reduceMotion,
}: {
  title: string;
  subtitle: string;
  reduceMotion?: boolean | null;
}) {
  const inner = (
    <div className="space-y-6">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] max-w-xl bg-gradient-to-l from-primary/[0.06] to-transparent lg:block"
        />
        <div className="relative grid gap-6 text-right lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12 xl:gap-16 lg:items-start">
          <div className="space-y-2 lg:pt-1">
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">{title}</h2>
          </div>
          <div className="relative min-w-0 border-t border-primary/15 pt-6 lg:border-t-0 lg:border-r lg:border-primary/20 lg:pt-0 lg:pr-10 xl:pr-14">
            <p className="text-pretty text-[15px] leading-[1.85] text-muted-foreground md:text-base lg:text-lg lg:leading-[1.9]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <div className="h-px flex-1 max-w-[4.5rem] bg-gradient-to-l from-transparent to-primary/40" />
        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80 shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
        <div className="h-px flex-1 bg-gradient-to-l from-primary/50 via-secondary/40 to-transparent md:max-w-none" />
      </div>
    </div>
  );

  if (reduceMotion) {
    return <div className="mb-8 text-right">{inner}</div>;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="mb-8 text-right"
    >
      {inner}
    </motion.div>
  );
}

function renderSectionContent(
  section: LawTabSection,
  query: string,
  reduceMotion: boolean | null,
) {
  if (section.kind === "penalties") {
    return (
      <>
        <SectionIntro reduceMotion={reduceMotion} title={section.label} subtitle={section.subtitle} />
        <LawsPenaltiesSection block={section.penalties} reduceMotion={reduceMotion} />
      </>
    );
  }

  return (
    <>
      <SectionIntro reduceMotion={reduceMotion} title={section.label} subtitle={section.subtitle} />
      <RulesGrid rules={section.rules} variant={section.variant} query={query} reduceMotion={reduceMotion} />
      {section.id === "store" ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          layout={!reduceMotion}
          className="mt-8 rounded-2xl border border-secondary/35 bg-secondary/5 p-6 text-center md:text-right"
        >
          <p className="font-display text-lg text-foreground">التزام المشترين</p>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            يسهّل الالتزام هذه القوانين تجربة عادلة للجميع داخل المتجر والمدينة.
          </p>
        </motion.div>
      ) : null}
    </>
  );
}

const LawsPage = () => {
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState("");
  const { sections } = useLawsContent();
  const visibility = useSiteVisibility();
  const visibleSections = useMemo(() => sections.filter((s) => !s.hidden), [sections]);

  const defaultTab = visibleSections[0]?.id ?? "general";
  if (!visibility.pages.laws) return <Navigate to="/" replace />;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />

      <InstitutionHero
        badgeEn="LAWS & CONSTITUTION"
        alt="دستور المدينة — TRUST CFW"
        title={
          <>
            صفحة <span className="text-gradient-neon">دستور المدينة</span>
          </>
        }
      />

      <main className="pb-20">
        <div className={PAGE_GUTTER}>
          <div className="glass-panel relative overflow-hidden rounded-xl p-6 sm:p-8 md:p-10">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 max-w-md bg-gradient-to-l from-primary/[0.07] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[28%] max-w-sm bg-gradient-to-r from-secondary/[0.05] to-transparent" />
            <p className="relative text-pretty text-right text-muted-foreground leading-[1.85] md:text-lg lg:text-xl lg:leading-[1.9]">
              أنت على أبواب دخول مدينة إنفينيتي. نسعى لمجتمع أقرب للكمال في الـ Roleplay — نرجو الإلمام الكامل بالقوانين
              والالتزام بها احترامًا للجميع.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-4 md:mt-12 md:flex-row md:items-center md:justify-between md:gap-8 lg:gap-12">
            <div className="relative min-w-0 flex-1 md:max-w-xl lg:max-w-2xl">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في القسم النشط عن كلمة، مثال: رهينة، سرقة، باند..."
                className="h-12 rounded-2xl border-primary/30 bg-card/60 pr-10 text-right backdrop-blur-sm placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
              />
            </div>
            <p className="shrink-0 text-center text-xs text-muted-foreground md:text-right font-display tracking-wide lg:max-w-md lg:text-sm">
              استخدم التبويبات أدناه ثم ابحث داخل القسم المفتوح
            </p>
          </div>
        </div>

        <Tabs key={visibleSections.map((s) => s.id).join("|")} defaultValue={defaultTab} className="mt-6 w-full md:mt-8">
          <div className="sticky top-14 z-40 flex justify-center px-3 py-2 sm:top-16 md:px-6 md:py-2.5 xl:px-10">
            <TabsList
              className={cn(
                "inline-flex h-auto w-auto max-w-[calc(100vw-1.5rem)] flex-wrap justify-center gap-1.5 rounded-2xl border border-primary/25 p-1.5",
                "bg-muted/50 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl supports-[backdrop-filter]:bg-muted/45",
                "sm:gap-2 sm:p-2 md:max-w-none",
              )}
            >
              {visibleSections.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-display data-[state=active]:bg-gradient-neon data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_28px_hsl(var(--primary)/0.45)] md:px-4 md:text-sm"
                >
                  <LawIcon className="h-4 w-4 shrink-0 opacity-80 group-data-[state=active]:opacity-100" name={t.icon} />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className="sm:hidden">{t.short}</span>
                  <span className="rounded-md bg-background/50 px-1.5 py-0.5 font-latin-display text-[10px] text-muted-foreground group-data-[state=active]:bg-primary-foreground/20 group-data-[state=active]:text-primary-foreground">
                    {sectionItemCount(t)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className={PAGE_GUTTER}>
            {visibleSections.map((section) => (
              <TabsContent key={section.id} value={section.id} className="mt-8 outline-none" forceMount={false}>
                {renderSectionContent(
                  section.kind === "rules" ? { ...section, rules: section.rules.filter((r) => !r.hidden) } : section,
                  query,
                  reduceMotion,
                )}
              </TabsContent>
            ))}
          </div>
        </Tabs>

        <div className={`${PAGE_GUTTER} pt-8 pb-2 text-right`}>
          <Link
            to="/justice"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            العودة إلى وزارة العدل
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LawsPage;
