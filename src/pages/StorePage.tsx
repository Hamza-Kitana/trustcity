import { useMemo, type ReactNode } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Car, Home, Package, Store, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import InstitutionHero from "@/components/InstitutionHero";
import { VipCarsCatalogBlock } from "@/components/store/VipCarsCatalogBlock";
import { HousesCatalogBlock } from "@/components/store/HousesCatalogBlock";
import { PackagesCatalogBlock } from "@/components/store/PackagesCatalogBlock";
import { InvestmentsCatalogBlock } from "@/components/store/InvestmentsCatalogBlock";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSiteVisibility } from "@/lib/siteVisibility";
import { cn } from "@/lib/utils";

/** حاوية المحتوى — امتداد أفقي أوضح (مثل القوانين ومن نحن) */
const PAGE_GUTTER =
  "mx-auto w-full max-w-[min(100%,92rem)] px-4 sm:px-6 md:px-10 lg:px-14 xl:px-16";

const TAB_KEYS = ["cars", "houses", "packages", "investment"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function isTabKey(s: string): s is TabKey {
  return (TAB_KEYS as readonly string[]).includes(s);
}

function SectionHeader({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6 text-right">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] max-w-xl bg-gradient-to-l from-primary/[0.06] to-transparent lg:block"
        />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-12 xl:gap-16 lg:items-start">
          <div className="space-y-2 lg:pt-1">
            <p className="font-display text-xs tracking-[0.28em] text-primary/90">{eyebrow}</p>
            <h3 className="font-display text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">{title}</h3>
          </div>
          {children ? (
            <div className="relative min-w-0 border-t border-primary/15 pt-6 lg:border-t-0 lg:border-r lg:border-primary/20 lg:pt-0 lg:pr-10 xl:pr-14">
              <div className="text-pretty text-sm leading-[1.85] text-muted-foreground md:text-base lg:text-lg lg:leading-[1.9] [&_p]:max-w-none">
                {children}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <div className="h-px flex-1 max-w-[4.5rem] bg-gradient-to-l from-transparent to-primary/40" />
        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80 shadow-[0_0_12px_hsl(var(--primary)/0.6)]" />
        <div className="h-px flex-1 bg-gradient-to-l from-primary/50 via-secondary/40 to-transparent md:max-w-none" />
      </div>
    </div>
  );
}

const StorePage = () => {
  const reduceMotion = useReducedMotion();
  const visibility = useSiteVisibility();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo((): TabKey => {
    const raw = searchParams.get("tab") ?? "cars";
    return isTabKey(raw) ? raw : "cars";
  }, [searchParams]);

  const setTab = (v: string) => {
    if (isTabKey(v)) {
      setSearchParams(v === "cars" ? {} : { tab: v }, { replace: true });
    }
  };

  const allHidden =
    !visibility.pages.vipCars &&
    !visibility.pages.houses &&
    !visibility.pages.packages &&
    !visibility.pages.investments;

  if (allHidden) return <Navigate to="/" replace />;

  const tabsCount = [
    visibility.pages.vipCars,
    visibility.pages.houses,
    visibility.pages.packages,
    visibility.pages.investments,
  ].filter(Boolean).length;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />

      <InstitutionHero
        badgeEn="STORE & INVESTMENT"
        alt="متجر TRUST CFW"
        title={
          <>
            <span className="text-gradient-neon">متجر</span>{" "}
            <span className="text-foreground">TRUST CFW</span>
          </>
        }
      />

      <main className="pb-20">
        <div className={PAGE_GUTTER}>
          <div className="glass-panel relative overflow-hidden rounded-xl p-6 sm:p-8 md:p-10">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 max-w-md bg-gradient-to-l from-primary/[0.07] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[28%] max-w-sm bg-gradient-to-r from-secondary/[0.05] to-transparent" />
            <div className="relative grid gap-6 text-right lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-10 xl:gap-14">
              <div className="min-w-0 space-y-3">
                <p className="font-display text-[11px] tracking-[0.32em] text-primary/90">المتجر والاستثمار</p>
                <h2 className="font-display text-2xl font-bold leading-snug md:text-3xl lg:text-4xl">
                  كل ما تحتاجه داخل <span className="text-gradient-neon">المدينة</span>
                </h2>
                <p className="text-pretty text-muted-foreground leading-[1.85] md:text-lg lg:text-xl lg:leading-[1.9]">
                  سيارات VIP، عقارات وبيوت، بكجات اشتراك، وفرص استثمار — تصفّح الأقسام أدناه ثم اضغط على أي بطاقة
                  للاطّلاع على التفاصيل وفتح نافذة الطلب.
                </p>
              </div>
              <div className="hidden shrink-0 rounded-2xl border border-primary/25 bg-primary/[0.08] p-4 text-primary md:flex md:items-center md:justify-center">
                <Store className="h-8 w-8" aria-hidden />
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setTab} className="mt-6 w-full md:mt-8">
          <div className="sticky top-14 z-40 flex justify-center px-3 py-2 sm:top-16 md:px-6 md:py-2.5 xl:px-10">
            <TabsList
              className={cn(
                "inline-flex h-auto w-auto max-w-[calc(100vw-1.5rem)] flex-wrap justify-center gap-1.5 rounded-2xl border border-primary/25 p-1.5",
                "bg-muted/50 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl supports-[backdrop-filter]:bg-muted/45",
                "sm:gap-2 sm:p-2 md:max-w-none",
              )}
            >
              {visibility.pages.vipCars ? (
                <TabsTrigger
                  value="cars"
                  className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-display data-[state=active]:bg-gradient-neon data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_28px_hsl(var(--primary)/0.45)] md:px-4 md:text-sm"
                >
                  <Car className="h-4 w-4 shrink-0 opacity-80 group-data-[state=active]:opacity-100" />
                  سيارات VIP
                </TabsTrigger>
              ) : null}
              {visibility.pages.houses ? (
                <TabsTrigger
                  value="houses"
                  className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-display data-[state=active]:bg-gradient-neon data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_28px_hsl(var(--primary)/0.45)] md:px-4 md:text-sm"
                >
                  <Home className="h-4 w-4 shrink-0 opacity-80 group-data-[state=active]:opacity-100" />
                  البيوت
                </TabsTrigger>
              ) : null}
              {visibility.pages.packages ? (
                <TabsTrigger
                  value="packages"
                  className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-display data-[state=active]:bg-gradient-neon data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_28px_hsl(var(--primary)/0.45)] md:px-4 md:text-sm"
                >
                  <Package className="h-4 w-4 shrink-0 opacity-80 group-data-[state=active]:opacity-100" />
                  البكجات
                </TabsTrigger>
              ) : null}
              {visibility.pages.investments ? (
                <TabsTrigger
                  value="investment"
                  className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-display data-[state=active]:bg-gradient-neon data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_28px_hsl(var(--primary)/0.45)] md:px-4 md:text-sm"
                >
                  <TrendingUp className="h-4 w-4 shrink-0 opacity-80 group-data-[state=active]:opacity-100" />
                  استثمار في المدينة
                </TabsTrigger>
              ) : null}
            </TabsList>
          </div>

          <div className={`${PAGE_GUTTER} mt-6 md:mt-8`}>
            {visibility.pages.vipCars ? (
              <TabsContent value="cars" className="mt-0 outline-none">
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="glass-panel relative overflow-hidden rounded-2xl p-5 md:p-8 lg:p-10"
                >
                  <SectionHeader title="كتالوج سيارات VIP" eyebrow="مركبات حصرية">
                    <p>
                      تصفّح المركبات المتاحة، افتح البطاقة للتفاصيل والصور، ثم استخدم «طلب السيارة» للانتقال
                      لنموذج الطلب.
                    </p>
                  </SectionHeader>
                  <div className="mt-8">
                    {activeTab === "cars" ? <VipCarsCatalogBlock /> : null}
                  </div>
                </motion.div>
              </TabsContent>
            ) : null}

            {visibility.pages.houses ? (
              <TabsContent value="houses" className="mt-0 outline-none">
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="glass-panel relative overflow-hidden rounded-2xl p-5 md:p-8 lg:p-10"
                >
                  <SectionHeader title="العقارات والبيوت" eyebrow="سكن وتجارة">
                    <p>
                      فيلات، شقق، ومحلات تجارية ضمن أحياء المدينة. اضغط على أي بطاقة لرؤية المواصفات والصور.
                    </p>
                  </SectionHeader>
                  <div className="mt-8">
                    <HousesCatalogBlock />
                  </div>
                </motion.div>
              </TabsContent>
            ) : null}

            {visibility.pages.packages ? (
              <TabsContent value="packages" className="mt-0 outline-none">
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="glass-panel relative overflow-hidden rounded-2xl p-5 md:p-8 lg:p-10"
                >
                  <SectionHeader title="البكجات" eyebrow="حزم ومزايا">
                    <p>
                      باقات اشتراك، عروض موسمية، ومزايا داخل اللعبة — اضغط على البكج لرؤية كل ما يتضمّنه.
                    </p>
                  </SectionHeader>
                  <div className="mt-8">
                    <PackagesCatalogBlock />
                  </div>
                </motion.div>
              </TabsContent>
            ) : null}

            {visibility.pages.investments ? (
              <TabsContent value="investment" className="mt-0 outline-none">
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="glass-panel relative overflow-hidden rounded-2xl p-5 md:p-8 lg:p-10"
                >
                  <SectionHeader title="فرص الاستثمار في المدينة" eyebrow="شارك في الاقتصاد">
                    <p>
                      مطاعم، كازينو، محطات وقود وغيرها — تمثيلية داخل الرول بلاي وتخضع لقوانين السيرفر والموافقات
                      الإدارية.
                    </p>
                  </SectionHeader>
                  <div className="mt-8">
                    <InvestmentsCatalogBlock />
                  </div>
                </motion.div>
              </TabsContent>
            ) : null}
          </div>
        </Tabs>

        {tabsCount === 0 ? (
          <div className={`${PAGE_GUTTER} mt-10 text-center text-muted-foreground`}>
            لا توجد أقسام متاحة حالياً. تحقّق لاحقاً.
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
};

export default StorePage;
