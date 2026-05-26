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
import { GripVertical, ImagePlus, Package, Plus, Trash2 } from "lucide-react";
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
import { usePackagesContent } from "@/contexts/PackagesContentContext";
import { appendActivityLog } from "@/lib/activityLog";
import type { PackageCatalogItem } from "@/data/packagesCatalog";
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
  const base = fromLatin.length >= 2 ? fromLatin : `pkg-${crypto.randomUUID().slice(0, 8)}`;
  const set = new Set(existingIds);
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

function SortablePackageRow({
  item,
  active,
  onSelect,
  onEdit,
}: {
  item: PackageCatalogItem;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
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
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-right"
      >
        <img
          src={item.thumbnailUrl}
          alt=""
          className="h-12 w-16 shrink-0 rounded-lg object-cover border border-rose-200"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">
            {item.name}
            {item.featured ? <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700">مميز</span> : null}
          </p>
          <p className="truncate font-mono text-[10px] text-slate-600" dir="ltr">
            {item.id} · ${item.priceUsd} · {item.duration}
          </p>
        </div>
        {item.hidden ? (
          <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 font-display text-[10px] text-slate-700">
            مخفي
          </span>
        ) : null}
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 font-display text-[10px]",
            item.taken ? "bg-destructive/15 text-destructive" : "bg-emerald-500/15 text-emerald-600",
          )}
        >
          {item.taken ? "متوقف" : "متاح"}
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

const emptyItem = (): PackageCatalogItem => ({
  id: "",
  name: "",
  nameEn: "",
  thumbnailUrl: "/placeholder.svg",
  galleryUrls: [],
  priceUsd: 50,
  description: "",
  benefits: [],
  duration: "30 يوم",
  featured: false,
  taken: false,
  hidden: false,
});

const PackagesEditorPage = () => {
  const { user } = useAuth();
  const { packages, reorder, add, update, remove } = usePackagesContent();
  const visibility = useSiteVisibility();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "taken" | "available">("all");
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [editing, setEditing] = useState<PackageCatalogItem>(emptyItem());
  const [galleryText, setGalleryText] = useState("");
  const [benefitsText, setBenefitsText] = useState("");
  const thumbRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!selectedId && packages.length > 0) setSelectedId(packages[0].id);
    if (selectedId && !packages.some((p) => p.id === selectedId)) {
      setSelectedId(packages[0]?.id ?? null);
    }
  }, [packages, selectedId]);

  useEffect(() => {
    const sourceIds = packages.map((p) => p.id);
    setOrderedIds((prev) => {
      if (prev.length === 0) return sourceIds;
      const kept = prev.filter((id) => sourceIds.includes(id));
      const added = sourceIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [packages]);

  useEffect(() => {
    if (!dialogOpen) setDeleteConfirmOpen(false);
  }, [dialogOpen]);

  const displayed = useMemo(() => {
    const byId = new Map(packages.map((p) => [p.id, p]));
    return orderedIds.map((id) => byId.get(id)).filter((c): c is PackageCatalogItem => Boolean(c));
  }, [packages, orderedIds]);

  const filtered = displayed.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || `${p.name} ${p.id} ${p.priceUsd} ${p.duration}`.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "taken" ? p.taken : !p.taken;
    return matchesSearch && matchesStatus;
  });

  const hasPendingOrderChanges =
    orderedIds.length === packages.length && orderedIds.some((id, i) => id !== packages[i]?.id);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = filtered.findIndex((p) => p.id === active.id);
    const newIndex = filtered.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const targetId = filtered[newIndex]?.id;
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
    setEditing(emptyItem());
    setGalleryText("");
    setBenefitsText("");
    setDialogOpen(true);
  };

  const openEdit = (p: PackageCatalogItem) => {
    setIsNew(false);
    setEditing({ ...p, galleryUrls: [...p.galleryUrls], benefits: [...p.benefits] });
    setGalleryText(p.galleryUrls.join("\n"));
    setBenefitsText(p.benefits.join("\n"));
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
      toast.error("اسم البكج مطلوب");
      return;
    }
    const gallery = galleryText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (gallery.length < 1) {
      toast.error("أضف صورة واحدة على الأقل");
      return;
    }
    const benefits = benefitsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (benefits.length < 1) {
      toast.error("أضف ميزة واحدة على الأقل");
      return;
    }
    const priceUsd = Math.max(0, Math.round(Number(editing.priceUsd)) || 0);

    const full: PackageCatalogItem = {
      id: editing.id,
      name,
      nameEn: editing.nameEn?.trim() || undefined,
      thumbnailUrl: editing.thumbnailUrl.trim() || "/placeholder.svg",
      galleryUrls: gallery,
      priceUsd,
      description: editing.description.trim(),
      benefits,
      duration: editing.duration.trim() || "—",
      featured: !!editing.featured,
      taken: editing.taken,
      hidden: !!editing.hidden,
    };

    if (isNew) {
      const existingIds = packages.map((p) => p.id);
      const id =
        editing.id.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48) ||
        suggestId(name, existingIds);
      if (existingIds.includes(id)) {
        toast.error("المعرّف مستخدم");
        return;
      }
      add({ ...full, id });
      setSelectedId(id);
      appendActivityLog(user?.username ?? "—", "بكجات: إضافة", full.name);
      toast.success("تمت الإضافة");
    } else {
      update(editing.id, { ...full, id: editing.id });
      appendActivityLog(user?.username ?? "—", "بكجات: تعديل", full.name);
      toast.success("تم الحفظ");
    }
    setDialogOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 text-right sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center justify-end gap-2 font-display text-2xl font-bold text-slate-900">
            <Package className="h-7 w-7 text-rose-700" />
            مدير البكجات
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            أضف بكجات الاشتراك والمزايا التي تظهر في{" "}
            <a
              href="/store?tab=packages"
              target="_blank"
              rel="noreferrer"
              className="text-rose-700 underline-offset-4 hover:underline"
            >
              قسم البكجات
            </a>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={() => setPageVisible("packages", !visibility.pages.packages)}
          >
            {visibility.pages.packages ? "إخفاء قسم البكجات" : "إظهار قسم البكجات"}
          </Button>
          {hasPendingOrderChanges ? (
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              onClick={() => {
                const working = packages.map((p) => p.id);
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
            <Plus className="ms-1 h-4 w-4" /> بكج جديد
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-rose-200/80 bg-white/85 p-4 shadow-[0_18px_44px_-28px_rgba(127,29,29,0.45)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="text-right">
            <Label htmlFor="pkg-search" className="text-slate-700">
              بحث (الاسم، المعرّف، السعر، المدة)
            </Label>
            <Input
              id="pkg-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-1.5 border-rose-200 bg-rose-50/35 text-slate-900 placeholder:text-slate-400 focus-visible:ring-rose-400"
              placeholder="اكتب للبحث..."
              autoComplete="off"
            />
          </div>
          <div className="text-right">
            <Label className="text-slate-700">الحالة</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "taken" | "available")}>
              <SelectTrigger className="mt-1.5 border-rose-200 bg-rose-50/35 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl" className="border-rose-200 bg-white text-slate-900">
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="taken">المتوقفة فقط</SelectItem>
                <SelectItem value="available">المتاحة فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="font-display text-xs tracking-wide text-slate-500">الترتيب (اسحب)</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={filtered.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <SortablePackageRow
                    key={p.id}
                    item={p}
                    active={selectedId === p.id}
                    onSelect={() => setSelectedId(p.id)}
                    onEdit={() => openEdit(p)}
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
                {isNew ? "بكج جديد" : "تعديل البكج"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-600">
                املأ الحقول، ثم احفظ — يظهر التحديث فوراً في صفحة المتجر.
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
                  حذف البكج
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
                    placeholder="my-pack"
                    value={editing.id}
                    onChange={(e) =>
                      setEditing((p) => ({
                        ...p,
                        id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48),
                      }))
                    }
                  />
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
                <Label className="text-xs font-medium text-slate-600">الاسم بالإنجليزية</Label>
                <Input
                  className={cn(editorDialogMonoClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                  dir="ltr"
                  value={editing.nameEn ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, nameEn: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">المدة (نص)</Label>
                <Input
                  className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                  placeholder='مثل: "30 يوم", "موسم", "دائم"'
                  value={editing.duration}
                  onChange={(e) => setEditing((p) => ({ ...p, duration: e.target.value }))}
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
                  <Label className="text-xs font-medium text-slate-600">بكج مميز (Featured)</Label>
                  <Select
                    value={editing.featured ? "yes" : "no"}
                    onValueChange={(v) => setEditing((p) => ({ ...p, featured: v === "yes" }))}
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
                  <Label className="text-xs font-medium text-slate-600">حالة البكج</Label>
                  <Select
                    value={editing.taken ? "yes" : "no"}
                    onValueChange={(v) => setEditing((p) => ({ ...p, taken: v === "yes" }))}
                  >
                    <SelectTrigger className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="no">متاح</SelectItem>
                      <SelectItem value="yes">متوقف</SelectItem>
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

            <EditorDialogSection title="مزايا البكج (سطر لكل ميزة)">
              <Textarea
                className={cn(editorDialogTextareaClass, "mt-1.5 min-h-[120px] border-rose-200 bg-white text-slate-900")}
                placeholder="ميزة 1&#10;ميزة 2&#10;ميزة 3"
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
              />
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
                  <ImagePlus className="ms-2 h-4 w-4" /> إضافة صورة
                </Button>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  عدد الصور الحالية: {editing.galleryUrls.length}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">روابط المعرض (سطر لكل رابط)</Label>
                <Textarea
                  className={cn(editorDialogTextareaClass, "mt-1.5 min-h-[88px] border-rose-200 bg-white text-slate-900 font-mono text-xs")}
                  dir="ltr"
                  value={galleryText}
                  onChange={(e) => setGalleryText(e.target.value)}
                />
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
            <AlertDialogTitle>حذف {editing.name || "البكج"}؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم الحذف نهائياً من القائمة.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                remove(editing.id);
                setSelectedId((prev) => (prev === editing.id ? null : prev));
                setDeleteConfirmOpen(false);
                setDialogOpen(false);
                toast.success("تم حذف البكج");
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

export default PackagesEditorPage;
