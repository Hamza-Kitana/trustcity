import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { StoreOrderTicketCTA } from "@/components/store/StoreOrderTicketCTA";
import {
  CircleStop,
  Gauge,
  ImageIcon,
  Lock,
  Pencil,
  Route,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { VipCatalogCar } from "@/data/vipCarsCatalog";
import { useVipCarsContent } from "@/contexts/VipCarsContentContext";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function StatHighlight({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  accent: "cyan" | "amber";
}) {
  const accentCls =
    accent === "cyan"
      ? "border-cyan-500/25 bg-gradient-to-br from-cyan-500/12 via-background/80 to-transparent shadow-[0_0_24px_-8px_rgba(34,211,238,0.25)]"
      : "border-amber-500/25 bg-gradient-to-br from-amber-500/12 via-background/80 to-transparent shadow-[0_0_24px_-8px_rgba(245,158,11,0.2)]";
  const iconCls = accent === "cyan" ? "text-cyan-400" : "text-amber-400";

  return (
    <div className={cn("rounded-xl border p-2 text-center ring-1 ring-white/5", accentCls)}>
      <Icon className={cn("mx-auto mb-1 h-4 w-4", iconCls)} aria-hidden />
      <p className="font-display text-[9px] font-medium tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-sm font-bold leading-tight tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function PerfBarRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Gauge;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <Icon className="h-3 w-3 shrink-0 text-primary" aria-hidden />
          {label}
        </span>
        <span className="font-latin-display text-[10px] tabular-nums text-muted-foreground/90">{value}</span>
      </div>
      <div dir="ltr" className="overflow-hidden rounded-full ring-1 ring-primary/10">
        <Progress value={value} className="h-2 bg-muted/60" />
      </div>
    </div>
  );
}

function VipCarStatsPanel({ car }: { car: VipCatalogCar }) {
  const p = car.stats.performance;
  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-muted/30 p-0.5 ring-1 ring-primary/10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-primary/[0.07] to-transparent" />
        <div className="relative space-y-2 p-2 sm:p-2.5">
          <p className="text-center font-display text-[11px] font-semibold tracking-wide text-primary">السرعة والأداء</p>
          <div className="grid grid-cols-2 gap-1.5">
            <StatHighlight icon={Gauge} label="أقصى سرعة" value={car.stats.topSpeed} accent="cyan" />
            <StatHighlight icon={Zap} label="التسارع 0→100" value={car.stats.acceleration} accent="amber" />
          </div>
          <div dir="rtl" className="space-y-2 rounded-lg border border-primary/10 bg-background/50 p-2">
            <p className="text-center font-display text-[9px] tracking-wider text-muted-foreground">مخطط الأداء (تقريبي)</p>
            <PerfBarRow label="السرعة القصوى" value={p.speed} icon={Gauge} />
            <PerfBarRow label="التسارع" value={p.acceleration} icon={Zap} />
            <PerfBarRow label="التحكم · المنعطفات" value={p.handling} icon={Route} />
            <PerfBarRow label="الكبح" value={p.braking} icon={CircleStop} />
          </div>
        </div>
      </div>
    </div>
  );
}

function VipGalleryCarousel({ urls, carName }: { urls: string[]; carName: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const sync = () => setCurrent(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  if (urls.length === 0) return null;

  return (
    <div className="relative">
      <Carousel
        key={urls.join("|")}
        setApi={setApi}
        opts={{ align: "center", loop: urls.length > 1, skipSnaps: false }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {urls.map((src, i) => (
            <CarouselItem key={`${src}-${i}`} className="basis-full pl-0">
              <div className="overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-b from-muted/40 to-muted/70 shadow-inner ring-1 ring-white/5">
                <div className="relative aspect-[4/3] w-full">
                  <img
                    src={src}
                    alt={`${carName} — صورة ${i + 1}`}
                    className="absolute inset-0 h-full w-full object-contain object-center"
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                  />
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {urls.length > 1 ? (
          <>
            <CarouselPrevious
              type="button"
              className="left-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 border-primary/35 bg-background/90 text-foreground shadow-lg backdrop-blur-sm hover:bg-background disabled:opacity-40 sm:left-3 sm:h-11 sm:w-11"
            />
            <CarouselNext
              type="button"
              className="right-2 top-1/2 z-10 h-10 w-10 -translate-y-1/2 border-primary/35 bg-background/90 text-foreground shadow-lg backdrop-blur-sm hover:bg-background disabled:opacity-40 sm:right-3 sm:h-11 sm:w-11"
            />
          </>
        ) : null}
      </Carousel>

      {urls.length > 1 ? (
        <div className="mt-2 flex flex-col items-center gap-2 sm:mt-3">
          <p className="font-display text-[11px] text-muted-foreground sm:text-xs">
            <span className="tabular-nums text-foreground">{current + 1}</span> / {urls.length}
            <span className="ms-2 text-muted-foreground/75">سحب أو أسهم</span>
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  i === current ? "w-8 bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]" : "w-2.5 bg-muted-foreground/35 hover:bg-muted-foreground/55",
                )}
                aria-label={`انتقل إلى الصورة ${i + 1}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VipCarCompactCard({
  car,
  onOpen,
}: {
  car: VipCatalogCar;
  onOpen: (car: VipCatalogCar) => void;
}) {
  return (
    <div
      className={cn(
        "relative w-full rounded-2xl p-[2px] shadow-[0_16px_44px_-22px_rgba(0,0,0,0.5)] transition-shadow duration-300",
        /* تدرّج ثابت بدل الحركة المستمرة — يخفّض جداً إعادة الرسم عند عرض شبكة كبيرة */
        "bg-gradient-to-br from-red-500 via-primary to-cyan-400",
        "hover:shadow-[0_22px_52px_-20px_hsl(var(--primary)/0.4)]",
        car.taken && "opacity-[0.92]",
        "supports-[content-visibility:auto]:[content-visibility:auto] supports-[content-visibility:auto]:[contain-intrinsic-size:auto_280px]",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(car)}
        className={cn(
          "group relative isolate aspect-[5/6] w-full min-h-[200px] overflow-hidden rounded-[calc(1rem-2px)] border-0 text-right shadow-inner ring-1 ring-black/20 transition sm:min-h-[220px] lg:min-h-[240px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <img
          src={car.thumbnailUrl}
          alt={car.name}
          className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          loading="lazy"
          decoding="async"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/[0.92] via-black/45 via-[32%] to-transparent to-[68%]"
          aria-hidden
        />
        {/* طبقة لمعان ثابتة خفيفة بدل mix-blend + أنيميشن لا نهائي (كان يسبب بطء وتقطيع) */}
        <div
          className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(ellipse_80%_55%_at_20%_0%,hsl(var(--primary)/0.22),transparent_58%),radial-gradient(ellipse_70%_50%_at_92%_96%,rgba(34,211,238,0.12),transparent_52%)] opacity-80"
          aria-hidden
        />

        {car.taken ? (
          <div className="absolute inset-0 z-[4] flex items-center justify-center bg-background/50 backdrop-blur-[4px]">
            <span className="rounded-full border border-destructive/55 bg-destructive/30 px-4 py-2 font-display text-sm font-bold tracking-wide text-destructive-foreground shadow-lg backdrop-blur-sm">
              ماخوذة
            </span>
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 z-[5] space-y-1 px-4 pb-4 pt-16 text-right sm:px-5 sm:pb-5 sm:pt-20">
          <h2 className="font-display text-base font-bold leading-snug tracking-tight text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.9)] sm:text-lg lg:text-xl">
            {car.name}
          </h2>
          <p
            className="font-latin-display text-xl font-bold tabular-nums tracking-tight text-primary drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)] sm:text-2xl"
            dir="ltr"
          >
            {usd.format(car.priceUsd)}
          </p>
        </div>
      </button>
    </div>
  );
}

function VipCarDialog({ car, open, onOpenChange }: { car: VipCatalogCar | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!car) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex w-[min(98vw,1240px)] max-w-[1240px] flex-col gap-0 overflow-hidden border-primary/25 bg-background p-0 shadow-2xl",
          "max-h-[92vh] rounded-2xl sm:rounded-3xl",
        )}
        dir="rtl"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:max-h-[calc(92vh-52px)] lg:flex-row lg:overflow-hidden">
          <div className="flex w-full min-h-0 shrink-0 flex-col gap-2 overflow-hidden border-b border-primary/15 px-3 py-3 sm:gap-2.5 sm:px-4 sm:py-3.5 lg:w-[min(100%,400px)] lg:max-w-[400px] lg:border-b-0 lg:border-e xl:w-[420px] xl:max-w-[420px]">
            <DialogHeader className="shrink-0 space-y-1.5 text-right">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {car.taken ? (
                  <Badge variant="destructive" className="font-display text-[11px]">
                    ماخوذة
                  </Badge>
                ) : (
                  <Badge className="border-primary/30 bg-primary/15 font-display text-[11px] text-primary">متاحة</Badge>
                )}
                <Badge variant="outline" className="font-display text-[11px]">
                  {car.modifiable ? (
                    <span className="inline-flex items-center gap-1">
                      <Pencil className="h-3 w-3" />
                      قابلة للتعديل
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      غير قابلة للتعديل
                    </span>
                  )}
                </Badge>
              </div>
              <DialogTitle className="font-display text-xl leading-snug sm:text-2xl">{car.name}</DialogTitle>
              {car.nameEn ? (
                <p className="font-latin-display text-xs text-muted-foreground" dir="ltr">
                  {car.nameEn}
                </p>
              ) : null}
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-transparent p-2.5">
                <p className="text-[10px] font-display text-muted-foreground">السعر (شراء حقيقي)</p>
                <p className="mt-0.5 font-latin-display text-xl font-bold tabular-nums text-primary sm:text-2xl" dir="ltr">
                  {usd.format(car.priceUsd)}
                </p>
                <p className="mt-0.5 text-[9px] leading-snug text-muted-foreground">USD · إدخال المركبة من الطاقم بعد الدفع</p>
              </div>
            </DialogHeader>

            <div className="shrink-0">
              <VipCarStatsPanel car={car} />
            </div>

            <DialogDescription asChild>
              <div className="shrink-0 rounded-xl border border-primary/12 bg-muted/30 p-2.5 text-right ring-1 ring-white/5">
                <p className="mb-1 font-display text-[10px] tracking-wider text-primary/90">عن السيارة</p>
                <p className="line-clamp-3 text-[13px] leading-snug text-muted-foreground">{car.description}</p>
              </div>
            </DialogDescription>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2 pt-1.5 sm:px-4 sm:pb-3 sm:pt-2">
            <p className="mb-1 flex shrink-0 items-center justify-end gap-2 font-display text-xs text-foreground">
              <ImageIcon className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" aria-hidden />
              معرض الصور
            </p>
            <div className="min-h-0 flex-1">
              <VipGalleryCarousel urls={car.galleryUrls} carName={car.name} />
            </div>
          </div>
        </div>

        <div className="flex min-h-[52px] shrink-0 flex-col gap-2 border-t border-primary/15 bg-muted/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-start sm:gap-6 sm:px-4 sm:py-2.5">
          <div className="flex w-full justify-start sm:w-auto sm:shrink-0">
            <StoreOrderTicketCTA
              taken={car.taken}
              buttonLabel="طلب السيارة"
              confirmSummary={car.name}
              subject={`سيارة VIP — ${car.name}`}
              productDetailsBody={[
                "طلب من صفحة المتجر (سيارات VIP).",
                "",
                `المعرّف: ${car.id}`,
                `الاسم: ${car.name}`,
                car.nameEn ? `الاسم الإنجليزي: ${car.nameEn}` : "",
                `السعر (USD): ${usd.format(car.priceUsd)}`,
                `قابلة للتعديل داخل السيرفر: ${car.modifiable ? "نعم" : "لا"}`,
                `أقصى سرعة (معروض): ${car.stats.topSpeed}`,
                `التسارع 0→100 (معروض): ${car.stats.acceleration}`,
              ]
                .filter(Boolean)
                .join("\n")}
              onAfterSubmit={() => onOpenChange(false)}
            />
          </div>
          <p className="min-w-0 flex-1 text-right text-[11px] leading-snug text-muted-foreground sm:text-xs">
            الحالة والتعديل وفق سياسة السيرفر.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** كتالوج سيارات VIP — يُستخدم في صفحة المتجر أو أي صفحة أخرى */
export function VipCarsCatalogBlock() {
  const { cars } = useVipCarsContent();
  const visibleCars = cars.filter((c) => !c.hidden);
  const [selected, setSelected] = useState<VipCatalogCar | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openCar = (car: VipCatalogCar) => {
    setSelected(car);
    setDialogOpen(true);
  };

  const handleDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setSelected(null);
  };

  return (
    <>
      <section className="mx-auto max-w-[1600px] px-0 sm:px-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4 xl:gap-5">
          {visibleCars.map((car) => (
            <VipCarCompactCard key={car.id} car={car} onOpen={openCar} />
          ))}
        </div>
      </section>
      <VipCarDialog car={selected} open={dialogOpen} onOpenChange={handleDialog} />
    </>
  );
}
