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
import { GripVertical, ImagePlus, Plus, Shield, Trash2 } from "lucide-react";
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
import { useGangsContent } from "@/contexts/GangsContentContext";
import { appendActivityLog } from "@/lib/activityLog";
import type { GangCard, GangStatus } from "@/types/gangsSchema";
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
    fromLatin.length >= 2 ? fromLatin : `gang-${crypto.randomUUID().slice(0, 8)}`;
  const set = new Set(existingIds);
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

function SortableGangRow({
  gang,
  active,
  onSelect,
  onEdit,
}: {
  gang: GangCard;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: gang.id,
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
        className="inline-flex w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/25 text-muted-foreground cursor-grab touch-manipulation active:cursor-grabbing"
        aria-label="سحب للترتيب"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-right">
        <img
          src={gang.logoImage}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover border border-primary/20"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{gang.name}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground" dir="ltr">
            {gang.id}
          </p>
        </div>
        {gang.hidden ? (
          <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 font-display text-[10px] text-slate-700">
            مخفية
          </span>
        ) : null}
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 font-display text-[10px]",
            gang.status === "taken" ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600",
          )}
        >
          {gang.status === "taken" ? "مأخوذة" : "متاحة"}
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

const emptyForm: GangCard = {
  id: "",
  name: "",
  nameEn: "",
  specialty: "",
  location: "",
  description: "",
  youtubeVideo: "",
  logoImage: "/trustLogo.png",
  status: "available",
  brandColor: "#9f1239",
  profilePoints: ["", "", ""],
  leaderName: "",
  hidden: false,
};

const GangsEditorPage = () => {
  const { user } = useAuth();
  const { gangs, reorder, add, update, remove } = useGangsContent();
  const visibility = useSiteVisibility();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "taken" | "available">("all");
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editing, setEditing] = useState<GangCard>(emptyForm);
  const [isNew, setIsNew] = useState(false);
  const [pointsText, setPointsText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!selectedId && gangs.length > 0) setSelectedId(gangs[0].id);
    if (selectedId && !gangs.some((g) => g.id === selectedId)) {
      setSelectedId(gangs[0]?.id ?? null);
    }
  }, [gangs, selectedId]);

  useEffect(() => {
    const sourceIds = gangs.map((g) => g.id);
    setOrderedIds((prev) => {
      if (prev.length === 0) return sourceIds;
      const kept = prev.filter((id) => sourceIds.includes(id));
      const added = sourceIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [gangs]);

  useEffect(() => {
    if (!dialogOpen) setDeleteConfirmOpen(false);
  }, [dialogOpen]);

  const displayedGangs = useMemo(() => {
    const byId = new Map(gangs.map((g) => [g.id, g]));
    return orderedIds.map((id) => byId.get(id)).filter((g): g is GangCard => Boolean(g));
  }, [gangs, orderedIds]);

  const filteredGangs = displayedGangs.filter((g) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || `${g.name} ${g.id} ${g.location}`.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" ? true : statusFilter === "taken" ? g.status === "taken" : g.status === "available";
    return matchesSearch && matchesStatus;
  });

  const hasPendingOrderChanges =
    orderedIds.length === gangs.length && orderedIds.some((id, i) => id !== gangs[i]?.id);

  const selected = gangs.find((g) => g.id === selectedId) ?? null;

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredGangs.findIndex((g) => g.id === active.id);
    const newIndex = filteredGangs.findIndex((g) => g.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const targetId = filteredGangs[newIndex]?.id;
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
    setEditing({ ...emptyForm, profilePoints: ["", "", ""] });
    setPointsText(["", "", ""].join("\n"));
    setDialogOpen(true);
  };

  const openEdit = (g: GangCard) => {
    setIsNew(false);
    setEditing({ ...g, profilePoints: [...g.profilePoints] });
    setPointsText(g.profilePoints.join("\n"));
    setDialogOpen(true);
  };

  const onPickLogo = useCallback(async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("حجم الصورة كبير جداً (حدّاً 2 ميجابايت تقريباً).");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setEditing((p) => ({ ...p, logoImage: dataUrl }));
      toast.success("تم تحميل الشعار");
    } catch {
      toast.error("تعذر قراءة الملف");
    }
  }, []);

  const saveDialog = () => {
    const name = editing.name.trim();
    if (!name) {
      toast.error("اسم العصابة مطلوب");
      return;
    }
    const points = pointsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (points.length < 1) {
      toast.error("أضف سطراً واحداً على الأقل في «نقاط الهوية»");
      return;
    }

    const payload: Omit<GangCard, "id"> & { id?: string } = {
      name,
      nameEn: editing.nameEn?.trim() || undefined,
      specialty: editing.specialty.trim(),
      location: editing.location.trim(),
      description: editing.description.trim(),
      youtubeVideo: editing.youtubeVideo.trim(),
      logoImage: editing.logoImage.trim() || "/trustLogo.png",
      status: editing.status,
      brandColor: editing.brandColor.trim() || "#9f1239",
      profilePoints: points,
      leaderName:
        editing.status === "taken" ? (editing.leaderName?.trim() || "مجهول") : undefined,
      hidden: !!editing.hidden,
    };

    if (isNew) {
      const existingIds = gangs.map((g) => g.id);
      const manual = editing.id.trim().toLowerCase();
      const id = manual || suggestId(name, existingIds);
      if (existingIds.includes(id)) {
        toast.error("المعرّف مستخدم — اختر معرّفاً آخر أو اترك الحقل ليُولَّد تلقائياً");
        return;
      }
      add({ ...payload, id } as GangCard);
      setSelectedId(id);
      appendActivityLog(user?.username ?? "—", "عصابات: إضافة", name);
      toast.success("تمت إضافة العصابة");
    } else {
      const id = editing.id;
      update(id, { ...payload });
      appendActivityLog(user?.username ?? "—", "عصابات: تعديل", name);
      toast.success("تم حفظ التعديلات");
    }
    setDialogOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 text-right sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center justify-end gap-2 font-display text-2xl font-bold text-slate-900">
            <Shield className="h-7 w-7 text-rose-700" />
            مدير العصابات
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            نفس الحقول المعروضة في صفحة العصابات. التعديل يظهر في{" "}
            <a href="/gangs" target="_blank" rel="noreferrer" className="text-rose-700 underline-offset-4 hover:underline">
              /gangs
            </a>{" "}
            مباشرةً.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={() => setPageVisible("gangs", !visibility.pages.gangs)}
          >
            {visibility.pages.gangs ? "إخفاء صفحة العصابات" : "إظهار صفحة العصابات"}
          </Button>
          {hasPendingOrderChanges ? (
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              onClick={() => {
                const working = gangs.map((g) => g.id);
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
            <Plus className="ms-1 h-4 w-4" /> عصابة جديدة
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-rose-200/80 bg-white/85 p-4 shadow-[0_18px_44px_-28px_rgba(127,29,29,0.45)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="text-right">
          <Label htmlFor="gang-search" className="text-slate-700">بحث بالاسم أو المعرف أو الموقع</Label>
          <Input
            id="gang-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-1.5 border-rose-200 bg-rose-50/35 text-slate-900 placeholder:text-slate-400 focus-visible:ring-rose-400"
            placeholder="اكتب اسم العصابة أو المعرف..."
            autoComplete="off"
            dir="rtl"
          />
        </div>
          <div className="text-right">
            <Label className="text-slate-700">حالة العصابات</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "taken" | "available")}>
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
          <SortableContext items={filteredGangs.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredGangs.length > 0 ? (
                filteredGangs.map((gang) => (
                  <SortableGangRow
                    key={gang.id}
                    gang={gang}
                    active={selectedId === gang.id}
                    onSelect={() => setSelectedId(gang.id)}
                    onEdit={() => openEdit(gang)}
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
                {isNew ? "عصابة جديدة" : "تعديل العصابة"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-600">
                حدّد الهوية والوسائط والحالة، ثم احفظ — يظهر التحديث في صفحة العصابات.
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
                  حذف العصابة
                </Button>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5 sm:px-8">
            <EditorDialogSection title="التعريف والمعرّف">
              {isNew ? (
                <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">المعرّف (اختياري)</Label>
                  <Input
                    className={cn(editorDialogMonoClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                    dir="ltr"
                    placeholder="مثال: my-crew"
                    value={editing.id}
                    onChange={(e) =>
                      setEditing((p) => ({
                        ...p,
                        id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48),
                      }))
                    }
                  />
                  <p className="text-[11px] text-slate-500">إن تركته فارغاً يُولَّد تلقائياً من الاسم.</p>
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
                <Label className="text-xs font-medium text-slate-600">الاسم العربي</Label>
                <Input
                  className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                  value={editing.name}
                  onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">الاسم الإنجليزي (اختياري)</Label>
                <Input
                  className={cn(editorDialogMonoClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                  dir="ltr"
                  value={editing.nameEn ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, nameEn: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">التخصص (السطر فوق الاسم)</Label>
                <Input
                  className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                  value={editing.specialty}
                  onChange={(e) => setEditing((p) => ({ ...p, specialty: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">الموقع</Label>
                <Input
                  className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                  value={editing.location}
                  onChange={(e) => setEditing((p) => ({ ...p, location: e.target.value }))}
                />
              </div>
            </EditorDialogSection>

            <EditorDialogSection title="المحتوى والوسائط">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">الوصف</Label>
                <Textarea
                  className={cn(editorDialogTextareaClass, "mt-1.5 min-h-[100px] border-rose-200 bg-white text-slate-900")}
                  value={editing.description}
                  onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">رابط أو معرف يوتيوب</Label>
                <Input
                  className={cn(editorDialogMonoClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                  dir="ltr"
                  value={editing.youtubeVideo}
                  onChange={(e) => setEditing((p) => ({ ...p, youtubeVideo: e.target.value }))}
                />
              </div>
            </EditorDialogSection>

            <EditorDialogSection title="الحالة والهوية">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">حالة العصابة</Label>
                <Select
                  value={editing.status}
                  onValueChange={(v) =>
                    setEditing((p) => ({
                      ...p,
                      status: v as GangStatus,
                      leaderName: v === "taken" ? p.leaderName || "مجهول" : undefined,
                    }))
                  }
                >
                  <SelectTrigger className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="available">متاحة</SelectItem>
                    <SelectItem value="taken">مأخوذة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing.status === "taken" ? (
                <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">اسم صاحب العصابة</Label>
                  <Input
                    className={cn(editorDialogInputClass, "mt-1.5 border-rose-200 bg-white text-slate-900")}
                    value={editing.leaderName ?? ""}
                    onChange={(e) => setEditing((p) => ({ ...p, leaderName: e.target.value }))}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">لون الهوية (HEX)</Label>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    type="color"
                    className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-rose-200 bg-white p-1"
                    value={/^#[0-9A-Fa-f]{6}$/.test(editing.brandColor) ? editing.brandColor : "#9f1239"}
                    onChange={(e) => setEditing((p) => ({ ...p, brandColor: e.target.value }))}
                  />
                  <Input
                    className={cn(editorDialogMonoClass, "min-w-0 flex-1 border-rose-200 bg-white text-slate-900")}
                    dir="ltr"
                    value={editing.brandColor}
                    onChange={(e) => setEditing((p) => ({ ...p, brandColor: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">نقاط الهوية (سطر لكل نقطة)</Label>
                <Textarea
                  className={cn(editorDialogTextareaClass, "mt-1.5 min-h-[120px] border-rose-200 bg-white font-mono text-sm text-slate-900")}
                  value={pointsText}
                  onChange={(e) => setPointsText(e.target.value)}
                  placeholder={"سطر 1\nسطر 2\nسطر 3"}
                />
              </div>
            </EditorDialogSection>

            <EditorDialogSection title="الشعار">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">رفع الشعار</Label>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  يتم اعتماد الشعار من رفع الملف فقط (بدون روابط).
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    onPickLogo(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 rounded-lg border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="ms-2 h-4 w-4" />
                  رفع شعار من الجهاز
                </Button>
              </div>
              <div className="mt-3 flex justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 p-3">
                <img
                  src={editing.logoImage || "/placeholder.svg"}
                  alt=""
                  className="max-h-36 max-w-full rounded-md border border-rose-200 object-contain"
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
            <AlertDialogTitle>حذف {editing.name || "العصابة"}؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف العنصر نهائياً من القائمة.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                appendActivityLog(user?.username ?? "—", "عصابات: حذف", editing.name || editing.id);
                remove(editing.id);
                setSelectedId((prev) => (prev === editing.id ? null : prev));
                setDeleteConfirmOpen(false);
                setDialogOpen(false);
                toast.success("تم حذف العصابة");
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

export default GangsEditorPage;
