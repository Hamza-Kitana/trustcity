import { useState } from "react";
import { CalendarClock, CheckCircle2, ImageIcon, Package, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePackagesContent } from "@/contexts/PackagesContentContext";
import type { PackageCatalogItem } from "@/data/packagesCatalog";
import { StoreGalleryCarousel } from "@/components/store/StoreGalleryCarousel";
import { StoreOrderTicketCTA } from "@/components/store/StoreOrderTicketCTA";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function PackageCompactCard({
  item,
  onOpen,
}: {
  item: PackageCatalogItem;
  onOpen: (item: PackageCatalogItem) => void;
}) {
  return (
    <div
      className={cn(
        "relative w-full rounded-2xl p-[2px] shadow-[0_16px_44px_-22px_rgba(0,0,0,0.5)] transition-[box-shadow,filter] duration-500",
        item.featured
          ? "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 bg-[length:300%_300%] animate-vip-gradient-shift motion-reduce:animate-none"
          : "bg-gradient-to-br from-rose-400 via-red-400 to-cyan-400 bg-[length:300%_300%] animate-vip-gradient-shift motion-reduce:animate-none",
        "hover:shadow-[0_22px_52px_-20px_hsl(var(--primary)/0.38)]",
        item.taken && "opacity-[0.9]",
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
              متوقف
            </span>
          </div>
        ) : null}

        <div className="absolute right-3 top-3 z-[5] flex flex-wrap items-center gap-1.5">
          {item.featured ? (
            <Badge className="border-amber-300/40 bg-gradient-to-l from-amber-500 to-orange-500 text-[10px] font-bold text-white shadow-md">
              <Sparkles className="me-1 h-3 w-3" /> مميز
            </Badge>
          ) : null}
          <Badge className="border-primary/40 bg-primary/85 text-[10px] font-semibold text-primary-foreground shadow-md">
            <CalendarClock className="me-1 h-3 w-3" />
            {item.duration}
          </Badge>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-[5] space-y-1 px-4 pb-4 pt-16 text-right sm:px-5 sm:pb-5 sm:pt-20">
          <h2 className="font-display text-base font-bold leading-snug tracking-tight text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.9)] sm:text-lg lg:text-xl">
            {item.name}
          </h2>
          <p className="line-clamp-2 text-[11px] leading-snug text-white/85 sm:text-[12px]">
            {item.description}
          </p>
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

function PackageDialog({
  item,
  open,
  onOpenChange,
}: {
  item: PackageCatalogItem | null;
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
                  <Badge variant="destructive" className="font-display text-[11px]">متوقف</Badge>
                ) : (
                  <Badge className="border-primary/30 bg-primary/15 font-display text-[11px] text-primary">متاح</Badge>
                )}
                {item.featured ? (
                  <Badge className="border-amber-300/40 bg-gradient-to-l from-amber-500 to-orange-500 text-[11px] font-bold text-white">
                    <Sparkles className="me-1 h-3 w-3" /> مميز
                  </Badge>
                ) : null}
                <Badge variant="outline" className="font-display text-[11px]">
                  <CalendarClock className="me-1 h-3 w-3" /> {item.duration}
                </Badge>
              </div>
              <DialogTitle className="font-display text-xl leading-snug sm:text-2xl">{item.name}</DialogTitle>
              {item.nameEn ? (
                <p className="font-latin-display text-xs text-muted-foreground" dir="ltr">{item.nameEn}</p>
              ) : null}
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-transparent p-2.5">
                <p className="text-[10px] font-display text-muted-foreground">سعر البكج</p>
                <p className="mt-0.5 font-latin-display text-xl font-bold tabular-nums text-primary sm:text-2xl" dir="ltr">
                  {usd.format(item.priceUsd)}
                </p>
              </div>
            </DialogHeader>

            {item.benefits.length > 0 ? (
              <div className="shrink-0 rounded-xl border border-primary/15 bg-muted/25 p-2.5 text-right">
                <p className="mb-2 flex items-center justify-end gap-1 font-display text-[11px] tracking-wider text-primary/90">
                  <Package className="h-3.5 w-3.5" />
                  ما يتضمّنه
                </p>
                <ul className="space-y-1.5 text-[12px] leading-snug text-foreground/90 sm:text-[13px]">
                  {item.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <DialogDescription asChild>
              <div className="shrink-0 rounded-xl border border-primary/12 bg-muted/30 p-2.5 text-right">
                <p className="mb-1 font-display text-[10px] tracking-wider text-primary/90">عن البكج</p>
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
              buttonLabel="اطلب البكج"
              confirmSummary={item.name}
              subject={`بكج — ${item.name}`}
              productDetailsBody={[
                "طلب من صفحة المتجر (البكجات).",
                "",
                `المعرّف: ${item.id}`,
                `الاسم: ${item.name}`,
                item.nameEn ? `الاسم الإنجليزي: ${item.nameEn}` : "",
                `المدة: ${item.duration}`,
                `مميز: ${item.featured ? "نعم" : "لا"}`,
                `السعر المعروض: ${usd.format(item.priceUsd)}`,
              ]
                .filter(Boolean)
                .join("\n")}
              onAfterSubmit={() => onOpenChange(false)}
            />
          </div>
          <p className="min-w-0 flex-1 text-right text-[11px] leading-snug text-muted-foreground sm:text-xs">
            تفعيل البكج يكون من الطاقم بعد التحقق من عملية الدفع.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PackagesCatalogBlock() {
  const { packages } = usePackagesContent();
  const visible = packages.filter((p) => !p.hidden);
  const [selected, setSelected] = useState<PackageCatalogItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const open = (p: PackageCatalogItem) => {
    setSelected(p);
    setDialogOpen(true);
  };

  const handleDialog = (o: boolean) => {
    setDialogOpen(o);
    if (!o) setSelected(null);
  };

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-primary/25 bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground backdrop-blur-sm">
        لا توجد بكجات متاحة حالياً.
      </div>
    );
  }

  return (
    <>
      <section className="mx-auto max-w-[1600px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4 xl:gap-5">
          {visible.map((p) => (
            <PackageCompactCard key={p.id} item={p} onOpen={open} />
          ))}
        </div>
      </section>
      <PackageDialog item={selected} open={dialogOpen} onOpenChange={handleDialog} />
    </>
  );
}

export default PackagesCatalogBlock;
