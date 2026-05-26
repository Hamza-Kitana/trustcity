import { useState } from "react";
import {
  Bath,
  BedDouble,
  Car as CarIcon,
  Home,
  ImageIcon,
  MapPin,
  Ruler,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useHousesContent } from "@/contexts/HousesContentContext";
import type { HouseCatalogItem } from "@/data/housesCatalog";
import { StoreGalleryCarousel } from "@/components/store/StoreGalleryCarousel";
import { StoreOrderTicketCTA } from "@/components/store/StoreOrderTicketCTA";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const CATEGORY_LABEL: Record<HouseCatalogItem["category"], string> = {
  villa: "فيلا",
  house: "منزل",
  apartment: "شقة",
  shop: "محل",
  office: "مكتب",
};

function HouseCompactCard({
  item,
  onOpen,
}: {
  item: HouseCatalogItem;
  onOpen: (item: HouseCatalogItem) => void;
}) {
  return (
    <div
      className={cn(
        "relative w-full rounded-2xl p-[2px] shadow-[0_16px_44px_-22px_rgba(0,0,0,0.5)] transition-[box-shadow,filter] duration-500",
        "bg-gradient-to-br from-emerald-400 via-rose-500 to-cyan-400 bg-[length:300%_300%] animate-vip-gradient-shift motion-reduce:animate-none",
        "hover:shadow-[0_22px_52px_-20px_hsl(var(--primary)/0.38)]",
        item.taken && "opacity-[0.92]",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="group relative aspect-[5/6] w-full min-h-[200px] overflow-hidden rounded-[calc(1rem-2px)] border-0 text-right shadow-inner ring-1 ring-black/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-[220px] lg:min-h-[240px]"
      >
        <img
          src={item.thumbnailUrl}
          alt={item.name}
          className="absolute inset-0 z-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.07]"
          loading="lazy"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/[0.92] via-black/45 via-[32%] to-transparent to-[68%]" aria-hidden />

        {item.taken ? (
          <div className="absolute inset-0 z-[4] flex items-center justify-center bg-background/50 backdrop-blur-[4px]">
            <span className="rounded-full border border-destructive/55 bg-destructive/30 px-4 py-2 font-display text-sm font-bold tracking-wide text-destructive-foreground shadow-lg backdrop-blur-sm">
              محجوز
            </span>
          </div>
        ) : null}

        <div className="absolute right-3 top-3 z-[5] flex flex-wrap items-center gap-1.5">
          <Badge className="border-primary/40 bg-primary/85 text-[10px] font-semibold text-primary-foreground shadow-md">
            {CATEGORY_LABEL[item.category]}
          </Badge>
          {item.furnished ? (
            <Badge className="border-emerald-300/40 bg-emerald-500/80 text-[10px] font-semibold text-white shadow-md">
              مؤثث
            </Badge>
          ) : null}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[5] space-y-1 px-4 pb-4 pt-16 text-right sm:px-5 sm:pb-5 sm:pt-20">
          <p className="flex items-center justify-end gap-1 text-[10px] font-medium text-white/85">
            <span>{item.district}</span>
            <MapPin className="h-2.5 w-2.5" />
          </p>
          <h2 className="font-display text-base font-bold leading-snug tracking-tight text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.9)] sm:text-lg lg:text-xl">
            {item.name}
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-2 text-[10px] text-white/85 sm:text-[11px]">
            {item.specs.bedrooms > 0 ? (
              <span className="inline-flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" />
                {item.specs.bedrooms}
              </span>
            ) : null}
            {item.specs.bathrooms > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                {item.specs.bathrooms}
              </span>
            ) : null}
            {item.specs.garages > 0 ? (
              <span className="inline-flex items-center gap-1">
                <CarIcon className="h-3.5 w-3.5" />
                {item.specs.garages}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5" />
              {item.specs.area}
            </span>
          </div>
          <p
            className="font-latin-display text-xl font-bold tabular-nums tracking-tight text-primary drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)] sm:text-2xl"
            dir="ltr"
          >
            {usd.format(item.priceUsd)}
          </p>
        </div>
      </button>
    </div>
  );
}

function HouseDialog({
  item,
  open,
  onOpenChange,
}: {
  item: HouseCatalogItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex w-[min(98vw,1240px)] max-w-[1240px] max-h-[92vh] flex-col gap-0 overflow-hidden border-primary/25 bg-background p-0 shadow-2xl rounded-2xl sm:rounded-3xl"
        dir="rtl"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:max-h-[calc(92vh-52px)] lg:flex-row lg:overflow-hidden">
          <div className="flex w-full min-h-0 shrink-0 flex-col gap-2 overflow-hidden border-b border-primary/15 px-3 py-3 sm:gap-2.5 sm:px-4 sm:py-3.5 lg:w-[min(100%,400px)] lg:max-w-[400px] lg:border-b-0 lg:border-e xl:w-[420px] xl:max-w-[420px]">
            <DialogHeader className="shrink-0 space-y-1.5 text-right">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {item.taken ? (
                  <Badge variant="destructive" className="font-display text-[11px]">محجوز</Badge>
                ) : (
                  <Badge className="border-primary/30 bg-primary/15 font-display text-[11px] text-primary">متاح</Badge>
                )}
                <Badge variant="outline" className="font-display text-[11px]">
                  {CATEGORY_LABEL[item.category]}
                </Badge>
                {item.furnished ? (
                  <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/10 text-emerald-600 font-display text-[11px]">
                    <Sparkles className="me-1 h-3 w-3" /> مؤثث
                  </Badge>
                ) : null}
              </div>
              <DialogTitle className="font-display text-xl leading-snug sm:text-2xl">{item.name}</DialogTitle>
              {item.nameEn ? (
                <p className="font-latin-display text-xs text-muted-foreground" dir="ltr">{item.nameEn}</p>
              ) : null}
              <p className="inline-flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {item.district}
              </p>
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-transparent p-2.5">
                <p className="text-[10px] font-display text-muted-foreground">السعر التقديري</p>
                <p className="mt-0.5 font-latin-display text-xl font-bold tabular-nums text-primary sm:text-2xl" dir="ltr">
                  {usd.format(item.priceUsd)}
                </p>
              </div>
            </DialogHeader>

            <div className="grid shrink-0 grid-cols-2 gap-1.5 rounded-xl border border-primary/15 bg-muted/25 p-2 text-center">
              {item.specs.bedrooms > 0 ? (
                <SpecBox icon={BedDouble} label="غرف" value={String(item.specs.bedrooms)} />
              ) : null}
              {item.specs.bathrooms > 0 ? (
                <SpecBox icon={Bath} label="حمامات" value={String(item.specs.bathrooms)} />
              ) : null}
              {item.specs.garages > 0 ? (
                <SpecBox icon={CarIcon} label="مرائب" value={String(item.specs.garages)} />
              ) : null}
              <SpecBox icon={Ruler} label="المساحة" value={item.specs.area} />
            </div>

            <DialogDescription asChild>
              <div className="shrink-0 rounded-xl border border-primary/12 bg-muted/30 p-2.5 text-right ring-1 ring-white/5">
                <p className="mb-1 font-display text-[10px] tracking-wider text-primary/90">عن العقار</p>
                <p className="text-[13px] leading-snug text-muted-foreground whitespace-pre-wrap">{item.description}</p>
              </div>
            </DialogDescription>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-2 pt-1.5 sm:px-4 sm:pb-3 sm:pt-2">
            <p className="mb-1 flex shrink-0 items-center justify-end gap-2 font-display text-xs text-foreground">
              <ImageIcon className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" /> معرض الصور
            </p>
            <div className="min-h-0 flex-1">
              <StoreGalleryCarousel urls={item.galleryUrls} alt={item.name} />
            </div>
          </div>
        </div>

        <div className="flex min-h-[52px] shrink-0 flex-col gap-2 border-t border-primary/15 bg-muted/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-start sm:gap-6 sm:px-4 sm:py-2.5">
          <div className="flex w-full justify-start sm:w-auto sm:shrink-0">
            <StoreOrderTicketCTA
              taken={item.taken}
              buttonLabel="طلب العقار"
              confirmSummary={item.name}
              subject={`عقار — ${item.name}`}
              productDetailsBody={[
                "طلب من صفحة المتجر (العقارات).",
                "",
                `المعرّف: ${item.id}`,
                `الاسم: ${item.name}`,
                item.nameEn ? `الاسم الإنجليزي: ${item.nameEn}` : "",
                `المنطقة: ${item.district}`,
                `الفئة: ${CATEGORY_LABEL[item.category]}`,
                `مؤثث: ${item.furnished ? "نعم" : "لا"}`,
                `السعر المعروض: ${usd.format(item.priceUsd)}`,
                `الغرف: ${item.specs.bedrooms}`,
                `الحمامات: ${item.specs.bathrooms}`,
                `المرائب: ${item.specs.garages}`,
                `المساحة: ${item.specs.area}`,
              ]
                .filter(Boolean)
                .join("\n")}
              onAfterSubmit={() => onOpenChange(false)}
            />
          </div>
          <p className="min-w-0 flex-1 text-right text-[11px] leading-snug text-muted-foreground sm:text-xs">
            التوافر والأسعار قد تتغيّر حسب حالة الموسم والإدارة.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SpecBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-primary/15 bg-background/60 px-2 py-1.5">
      <Icon className="mx-auto mb-0.5 h-4 w-4 text-primary" />
      <p className="font-display text-[9px] text-muted-foreground">{label}</p>
      <p className="font-display text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}

export function HousesCatalogBlock() {
  const { houses } = useHousesContent();
  const visible = houses.filter((h) => !h.hidden);
  const [selected, setSelected] = useState<HouseCatalogItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const open = (h: HouseCatalogItem) => {
    setSelected(h);
    setDialogOpen(true);
  };

  const handleDialog = (o: boolean) => {
    setDialogOpen(o);
    if (!o) setSelected(null);
  };

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-primary/25 bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground backdrop-blur-sm">
        لا توجد عقارات متاحة حالياً.
      </div>
    );
  }

  return (
    <>
      <section className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4 xl:gap-5">
          {visible.map((h) => (
            <HouseCompactCard key={h.id} item={h} onOpen={open} />
          ))}
        </div>
      </section>
      <HouseDialog item={selected} open={dialogOpen} onOpenChange={handleDialog} />
    </>
  );
}

export default HousesCatalogBlock;
