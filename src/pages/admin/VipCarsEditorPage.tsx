import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Car, GripVertical, ImagePlus, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EditorDialogSection,
  editorDialogInputClass,
  editorDialogMonoClass,
  editorDialogTextareaClass,
} from "@/components/admin/EditorDialogSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useVipCarsContent } from "@/contexts/VipCarsContentContext";
import { appendActivityLog } from "@/lib/activityLog";
import type { VipCatalogCar } from "@/data/vipCarsCatalog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { setPageVisible, useSiteVisibility } from "@/lib/siteVisibility";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

function suggestId(name: string, existingIds: string[]): string {
  const asciiOnly = Array.from(name.normalize("NFKD"))
    .filter((ch) => ch.charCodeAt(0) <= 0x7f)
    .join("");
  const fromLatin = asciiOnly
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);
  const base =
    fromLatin.length >= 2 ? fromLatin : `vip-${crypto.randomUUID().slice(0, 8)}`;
  const set = new Set(existingIds);
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function SortableCarRow({
  car,
  active,
  onSelect,
  onEdit,
}: {
  car: VipCatalogCar;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: car.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-stretch gap-2 rounded-xl border bg-rose-50/75 p-2 text-right transition-shadow",
        active ? "border-rose-400 ring-1 ring-rose-300" : "border-rose-200",
        isDragging && "z-20 opacity-90 shadow-lg",
      )}
    >
      <button
        type="button"
        className="inline-flex w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-500 cursor-grab touch-manipulation active:cursor-grabbing"
        aria-label="سحب للترتيب"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-right">
        <img
          src={car.thumbnailUrl}
          alt=""
          className="h-12 w-16 shrink-0 rounded-lg object-cover border border-rose-200"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{car.name}</p>
          <p className="truncate font-mono text-[10px] text-slate-600" dir="ltr">
            {car.id} · ${car.priceUsd}
          </p>
        </div>
        {car.hidden ? (
          <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 font-display text-[10px] text-slate-700">
            مخفية
          </span>
        ) : null}
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 font-display text-[10px]",
            car.taken ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-600",
          )}
        >
          {car.taken ? "مأخوذة" : "متاحة"}
        </span>
      </button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 shrink-0 border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
        onClick={onEdit}
      >
        تعديل
      </Button>
    </div>
  );
}

const emptyCar = (): VipCatalogCar => ({
  id: "",
  name: "",
  nameEn: "",
  thumbnailUrl: "/placeholder.svg",
  galleryUrls: [],
  priceUsd: 100,
  description: "",
  modifiable: true,
  taken: false,
  hidden: false,
  stats: {
    topSpeed: "~250 كم/س",
    acceleration: "~5 ث · 0→100",
    performance: { speed: 70, acceleration: 70, handling: 70, braking: 70 },
  },
});

const VipCarsEditorPage = () => {
  const { user } = useAuth();
  const { cars, reorder, add, update, remove } = useVipCarsContent();
  const visibility = useSiteVisibility();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [takenFilter, setTakenFilter] = useState<"all" | "taken" | "available">("all");
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editing, setEditing] = useState<VipCatalogCar>(emptyCar());
  const [galleryText, setGalleryText] = useState("");
  const thumbRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!selectedId && cars.length > 0) setSelectedId(cars[0].id);
    if (selectedId && !cars.some((c) => c.id === selectedId)) {
      setSelectedId(cars[0]?.id ?? null);
    }
  }, [cars, selectedId]);

  useEffect(() => {
    const sourceIds = cars.map((c) => c.id);
    setOrderedIds((prev) => {
      if (prev.length === 0) return sourceIds;
      const kept = prev.filter((id) => sourceIds.includes(id));
      const added = sourceIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [cars]);

  useEffect(() => {
    if (!dialogOpen) setDeleteConfirmOpen(false);
  }, [dialogOpen]);

  const displayedCars = useMemo(() => {
    const byId = new Map(cars.map((c) => [c.id, c]));
    return orderedIds.map((id) => byId.get(id)).filter((c): c is VipCatalogCar => Boolean(c));
  }, [cars, orderedIds]);

  const filteredCars = displayedCars.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || `${c.name} ${c.id} ${c.priceUsd}`.toLowerCase().includes(q);
    const matchesTaken = takenFilter === "all" ? true : takenFilter === "taken" ? c.taken : !c.taken;
    return matchesSearch && matchesTaken;
  });

  const hasPendingOrderChanges =
    orderedIds.length === cars.length && orderedIds.some((id, i) => id !== cars[i]?.id);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredCars.findIndex((c) => c.id === active.id);
    const newIndex = filteredCars.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const targetId = filteredCars[newIndex]?.id;
    if (!targetId) return;

    setOrderedIds((prev) => {
      const movingId = String(active.id);
      const from = prev.indexOf(movingId);
      const to = prev.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const openNew = () => {
    setIsNew(true);
    setEditing(emptyCar());
    setGalleryText("");
    setDialogOpen(true);
  };

  const openEdit = (c: VipCatalogCar) => {
    setIsNew(false);
    setEditing({ ...c, galleryUrls: [...c.galleryUrls], stats: { ...c.stats, performance: { ...c.stats.performance } } });
    setGalleryText(c.galleryUrls.join("\n"));
    setDialogOpen(true);
  };

  const onThumbFile = useCallback(async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("صورة الغلاف كبيرة جداً (حدّاً 2 ميجابايت).");
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setEditing((p) => ({ ...p, thumbnailUrl: url }));
      toast.success("تم تحميل الغلاف");
    } catch {
      toast.error("تعذر قراءة الملف");
    }
  }, []);

  const onGalleryFile = useCallback(async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("صورة المعرض كبيرة جداً.");
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setEditing((p) => ({ ...p, galleryUrls: [...p.galleryUrls, url] }));
      setGalleryText((t) => (t.trim() ? `${t.trim()}\n${url}` : url));
      toast.success("أُضيفت للمعرض");
    } catch {
      toast.error("تعذر قراءة الملف");
    }
  }, []);

  const saveDialog = () => {
    const name = editing.name.trim();
    if (!name) {
      toast.error("اسم السيارة مطلوب");
      return;
    }
    const gallery = galleryText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (gallery.length < 1) {
      toast.error("أضف رابطاً واحداً على الأقل لمعرض الصور (سطر لكل رابط)");
      return;
    }

    const priceUsd = Math.max(0, Math.round(Number(editing.priceUsd)) || 0);

    const full: VipCatalogCar = {
      id: editing.id,
      name,
      nameEn: editing.nameEn?.trim() || undefined,
      thumbnailUrl: editing.thumbnailUrl.trim() || "/placeholder.svg",
      galleryUrls: gallery,
      priceUsd,
      description: editing.description.trim(),
      modifiable: editing.modifiable,
      taken: editing.taken,
      hidden: !!editing.hidden,
      stats: {
        topSpeed: editing.stats.topSpeed.trim() || "—",
        acceleration: editing.stats.acceleration.trim() || "—",
        performance: {
          speed: clampPct(editing.stats.performance.speed),
          acceleration: clampPct(editing.stats.performance.acceleration),
          handling: clampPct(editing.stats.performance.handling),
          braking: clampPct(editing.stats.performance.braking),
        },
      },
    };

    if (isNew) {
      const existingIds = cars.map((c) => c.id);
      const id = editing.id.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48) || suggestId(name, existingIds);
      if (existingIds.includes(id)) {
        toast.error("المعرّف مستخدم");
        return;
      }
      add({ ...full, id });
      setSelectedId(id);
      appendActivityLog(user?.username ?? "—", "VIP: إضافة سيارة", full.name);
      toast.success("تمت الإضافة");
    } else {
      update(editing.id, { ...full, id: editing.id });
      appendActivityLog(user?.username ?? "—", "VIP: تعديل سيارة", full.name);
      toast.success("تم الحفظ");
    }
    setDialogOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 text-right sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center justify-end gap-2 font-display text-2xl font-bold text-slate-900">
            <Car className="h-7 w-7 text-rose-700" />
            مدير سيارات VIP
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            نفس حقول كتالوج السيارات الحالية. التعديل يظهر في{" "}
            <a href="/store" target="_blank" rel="noreferrer" className="text-rose-700 underline-offset-4 hover:underline">
              /store
            </a>{" "}
            مباشرةً.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={() => setPageVisible("vipCars", !visibility.pages.vipCars)}
          >
            {visibility.pages.vipCars ? "إخفاء صفحة سيارات VIP" : "إظهار صفحة سيارات VIP"}
          </Button>
          {hasPendingOrderChanges ? (
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              onClick={() => {
                const working = cars.map((c) => c.id);
                for (let targetIndex = 0; targetIndex < orderedIds.length; targetIndex += 1) {
                  const wantedId = orderedIds[targetIndex];
                  const currentIndex = working.indexOf(wantedId);
                  if (currentIndex < 0 || currentIndex === targetIndex) continue;
                  reorder(currentIndex, targetIndex);
                  const [moved] = working.splice(currentIndex, 1);
                  working.splice(targetIndex, 0, moved);
                }
                toast.success("تم حفظ الترتيب");
              }}
            >
              حفظ الترتيب
            </Button>
          ) : null}
          <Button type="button" className="bg-[#36164f] text-white hover:bg-[#2f1344]" onClick={openNew}>
            <Plus className="ms-1 h-4 w-4" /> سيارة جديدة
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-rose-200/80 bg-white/85 p-4 shadow-[0_18px_44px_-28px_rgba(127,29,29,0.45)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="text-right">
          <Label htmlFor="vip-search" className="text-slate-700">بحث بالاسم أو المعرف أو السعر</Label>
          <Input
            id="vip-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-1.5 border-rose-200 bg-rose-50/35 text-slate-900 placeholder:text-slate-400 focus-visible:ring-rose-400"
            placeholder="اكتب اسم السيارة أو المعرف..."
            autoComplete="off"
          />
        </div>
          <div className="text-right">
            <Label className="text-slate-700">حالة السيارات</Label>
            <Select value={takenFilter} onValueChange={(v) => setTakenFilter(v as "all" | "taken" | "available")}>
              <SelectTrigger className="mt-1.5 border-rose-200 bg-rose-50/35 text-slate-900 [&>span]:text-slate-900 data-[placeholder]:text-slate-700">
                <SelectValue className="text-slate-900 data-[placeholder]:text-slate-700" />
              </SelectTrigger>
              <SelectContent dir="rtl" className="border-rose-200 bg-white text-slate-900">
                <SelectItem value="all" className="text-slate-800 focus:bg-rose-50 focus:text-rose-900">الكل</SelectItem>
                <SelectItem value="taken" className="text-slate-800 focus:bg-rose-50 focus:text-rose-900">المأخوذة فقط</SelectItem>
                <SelectItem value="available" className="text-slate-800 focus:bg-rose-50 focus:text-rose-900">غير المأخوذة فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="font-display text-xs tracking-wide text-slate-500">الترتيب (اسحب)</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={filteredCars.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredCars.length > 0 ? (
                filteredCars.map((car) => (
                  <SortableCarRow
                    key={car.id}
                    car={car}
                    active={selectedId === car.id}
                    onSelect={() => setSelectedId(car.id)}
                    onEdit={() => openEdit(car)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-rose-200 bg-white/80 px-4 py-8 text-center text-sm text-slate-500">
                  لا توجد نتائج مطابقة للبحث.
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          dir="rtl"
          className="flex max-h-[min(92dvh,92svh)] w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/95 bg-white p-0 shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] sm:w-full lg:max-w-5xl"
        >
          <div className="shrink-0 border-b border-rose-200 bg-[radial-gradient(ellipse_100%_120%_at_50%_0%,rgba(244,63,94,0.22),transparent_58%)] px-6 pb-4 pt-14 sm:px-8 sm:pt-16">
            <DialogHeader className="space-y-1.5 text-right sm:text-right">
              <DialogTitle className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                {isNew ? "سيارة VIP جديدة" : "تعديل السيارة"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-600">
                املأ الأقسام بالترتيب، ثم احفظ — يظهر التحديث فوراً في صفحة الكتالوج.
              </DialogDescription>
            </DialogHeader>
            {!isNew ? (
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="ms-1 h-4 w-4" />
                  حذف السيارة
                </Button>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
            <EditorDialogSection title="التعريف">
              {isNew ? (
                <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">المعرّف (اختياري)</Label>
                  <Input
                    className={cn(editorDialogMonoClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                    dir="ltr"
                    placeholder="my-car"
                    value={editing.id}
                    onChange={(e) =>
                      setEditing((p) => ({
                        ...p,
                        id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48),
                      }))
                    }
                  />
                  <p className="text-[11px] text-slate-500">اتركه فارغاً ليُولَّد تلقائياً من الاسم.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">المعرّف</Label>
                  <Input
                    className={cn(editorDialogMonoClass, "mt-1.5 border-rose-200 bg-white text-slate-900 opacity-80")}
                    dir="ltr"
                    value={editing.id}
                    readOnly
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">الاسم</Label>
                <Input
                  className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                  value={editing.name}
                  onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">الاسم بالإنجليزية (اختياري)</Label>
                <Input
                  className={cn(editorDialogMonoClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                  dir="ltr"
                  value={editing.nameEn ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, nameEn: e.target.value }))}
                />
              </div>
            </EditorDialogSection>

            <EditorDialogSection title="السعر والحالة">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">السعر (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    className={cn(editorDialogMonoClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                    dir="ltr"
                    value={editing.priceUsd}
                    onChange={(e) => setEditing((p) => ({ ...p, priceUsd: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">قابلة للتعديل داخل اللعبة</Label>
                  <Select
                    value={editing.modifiable ? "yes" : "no"}
                    onValueChange={(v) => setEditing((p) => ({ ...p, modifiable: v === "yes" }))}
                  >
                    <SelectTrigger className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="yes">نعم</SelectItem>
                      <SelectItem value="no">لا</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium text-slate-600">حالة السيارة</Label>
                  <Select
                    value={editing.taken ? "yes" : "no"}
                    onValueChange={(v) => setEditing((p) => ({ ...p, taken: v === "yes" }))}
                  >
                    <SelectTrigger className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="no">متاحة</SelectItem>
                      <SelectItem value="yes">مأخوذة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </EditorDialogSection>

            <EditorDialogSection title="الوصف">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">نص الوصف</Label>
                <Textarea
                  className={cn(editorDialogTextareaClass, "mt-1.5 min-h-[100px] border-rose-200 bg-white text-slate-900")}
                  value={editing.description}
                  onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </EditorDialogSection>

            <EditorDialogSection title="إحصائيات العرض (نص)">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">أقصى سرعة</Label>
                  <Input
                    className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                    value={editing.stats.topSpeed}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, stats: { ...p.stats, topSpeed: e.target.value } }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600">التسارع</Label>
                  <Input
                    className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                    value={editing.stats.acceleration}
                    onChange={(e) =>
                      setEditing((p) => ({ ...p, stats: { ...p.stats, acceleration: e.target.value } }))
                    }
                  />
                </div>
              </div>
            </EditorDialogSection>

            <EditorDialogSection title="مخطط الأداء (0–100)">
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["speed", "السرعة (شريط)"],
                    ["acceleration", "التسارع (شريط)"],
                    ["handling", "التحكم (شريط)"],
                    ["braking", "الكبح (شريط)"],
                  ] as const
                ).map(([k, label]) => (
                  <div key={k} className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600">{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className={cn(editorDialogMonoClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                      dir="ltr"
                      value={editing.stats.performance[k]}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          stats: {
                            ...p.stats,
                            performance: {
                              ...p.stats.performance,
                              [k]: clampPct(Number(e.target.value)),
                            },
                          },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </EditorDialogSection>

            <EditorDialogSection title="صورة الغلاف">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">رفع صورة الغلاف</Label>
                <input
                  ref={thumbRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    onThumbFile(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-lg border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() => thumbRef.current?.click()}
                >
                  <ImagePlus className="ms-2 h-4 w-4" /> رفع غلاف من الجهاز
                </Button>
              </div>
              <div className="mt-3 flex justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 p-3">
                <img
                  src={editing.thumbnailUrl || "/placeholder.svg"}
                  alt=""
                  className="max-h-36 max-w-full rounded-md border border-rose-200 object-contain"
                />
              </div>
            </EditorDialogSection>

            <EditorDialogSection title="معرض الصور">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">إضافة صور للمعرض</Label>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    onGalleryFile(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-lg border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() => galleryRef.current?.click()}
                >
                  <ImagePlus className="ms-2 h-4 w-4" /> إضافة صورة للمعرض
                </Button>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  عدد صور المعرض الحالية: {editing.galleryUrls.length}
                </p>
              </div>
            </EditorDialogSection>
          </div>

          <div className="shrink-0 border-t border-rose-200 bg-white/80 px-6 py-4 backdrop-blur-sm sm:px-8">
            <DialogFooter className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-start sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 sm:min-w-[7rem]"
                onClick={() => setEditing((p) => ({ ...p, hidden: !p.hidden }))}
              >
                {editing.hidden ? "إظهار بالموقع" : "إخفاء من الموقع"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 sm:min-w-[7rem]"
                onClick={() => setDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="button" className="rounded-lg bg-[#36164f] text-white hover:bg-[#2f1344] sm:min-w-[7rem]" onClick={saveDialog}>
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent dir="rtl" className="border-slate-200 bg-white text-slate-900 shadow-xl sm:rounded-2xl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>حذف {editing.name || "السيارة"}؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف السيارة نهائياً من القائمة.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                remove(editing.id);
                setSelectedId((prev) => (prev === editing.id ? null : prev));
                setDeleteConfirmOpen(false);
                setDialogOpen(false);
                toast.success("تم حذف السيارة");
              }}
            >
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VipCarsEditorPage;
