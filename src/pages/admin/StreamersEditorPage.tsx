import { useEffect, useMemo, useState } from "react";
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
import { GripVertical, Plus, Trash2, Video } from "lucide-react";
import { StreamerCardEditFields } from "@/components/admin/StreamerCardEditFields";
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
  editorDialogTextareaClass,
} from "@/components/admin/EditorDialogSection";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  STREAMER_PLACEHOLDER_IMAGE,
  type StreamerCardDraft,
} from "@/lib/streamerApplication";
import { useAuth } from "@/contexts/AuthContext";
import { useStreamersContent } from "@/contexts/StreamersContentContext";
import { appendActivityLog } from "@/lib/activityLog";
import type { StreamerEntry } from "@/types/streamersSchema";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { setPageVisible, useSiteVisibility } from "@/lib/siteVisibility";

function SortableStreamerRow({
  entry,
  active,
  onSelect,
  onEdit,
}: {
  entry: StreamerEntry;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-stretch gap-2 rounded-xl border bg-white/95 p-2 text-right shadow-sm transition-shadow",
        active ? "border-rose-400 ring-1 ring-rose-300" : "border-rose-200",
        isDragging && "z-20 opacity-90 shadow-lg",
      )}
    >
      <button
        type="button"
        className="inline-flex w-9 shrink-0 cursor-grab touch-manipulation items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-500 active:cursor-grabbing"
        aria-label="سحب للترتيب"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1 text-right">
        <img
          src={entry.image}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg border border-rose-200 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold text-slate-900">{entry.name}</p>
          <p className="truncate text-xs text-slate-600">{entry.role}</p>
        </div>
        {entry.hidden ? (
          <span className="shrink-0 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-display text-slate-700">
            مخفي
          </span>
        ) : null}
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

const emptyForm: Omit<StreamerEntry, "id"> = {
  name: "",
  role: "صانع محتوى معتمد",
  bio: "",
  streamUrl: "",
  image: "/placeholder.svg",
  hidden: false,
};

const StreamersEditorPage = () => {
  const { user } = useAuth();
  const { items, reorder, add, update, remove } = useStreamersContent();
  const visibility = useSiteVisibility();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editing, setEditing] = useState<Omit<StreamerEntry, "id"> & { id?: string }>(emptyForm);
  const [cardDraft, setCardDraft] = useState<StreamerCardDraft>({
    name: "",
    role: "صانع محتوى معتمد",
    bio: "",
    streamUrl: "",
    image: STREAMER_PLACEHOLDER_IMAGE,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!selectedId && items.length > 0) setSelectedId(items[0].id);
    if (selectedId && !items.some((x) => x.id === selectedId)) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [items, selectedId]);

  useEffect(() => {
    const sourceIds = items.map((x) => x.id);
    setOrderedIds((prev) => {
      if (prev.length === 0) return sourceIds;
      const kept = prev.filter((id) => sourceIds.includes(id));
      const added = sourceIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [items]);

  useEffect(() => {
    if (!dialogOpen) setDeleteConfirmOpen(false);
  }, [dialogOpen]);

  const displayedItems = useMemo(() => {
    const byId = new Map(items.map((x) => [x.id, x]));
    return orderedIds.map((id) => byId.get(id)).filter((x): x is StreamerEntry => Boolean(x));
  }, [items, orderedIds]);

  const filteredItems = displayedItems.filter((entry) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return `${entry.name} ${entry.streamUrl}`.toLowerCase().includes(q);
  });

  const hasPendingOrderChanges =
    orderedIds.length === items.length && orderedIds.some((id, i) => id !== items[i]?.id);

  const selected = items.find((x) => x.id === selectedId) ?? null;

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = filteredItems.findIndex((x) => x.id === active.id);
    const newIndex = filteredItems.findIndex((x) => x.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const targetId = filteredItems[newIndex]?.id;
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
    setEditing({ ...emptyForm });
    setCardDraft({
      name: "",
      role: "صانع محتوى معتمد",
      bio: "",
      streamUrl: "",
      image: STREAMER_PLACEHOLDER_IMAGE,
    });
    setDialogOpen(true);
  };

  const openEdit = (s: StreamerEntry) => {
    setEditing({
      id: s.id,
      name: s.name,
      role: s.role,
      bio: s.bio,
      streamUrl: s.streamUrl,
      image: s.image,
      hidden: !!s.hidden,
    });
    setCardDraft({
      name: s.name,
      role: s.role,
      bio: s.bio,
      streamUrl: s.streamUrl,
      image: s.image || STREAMER_PLACEHOLDER_IMAGE,
    });
    setDialogOpen(true);
  };

  const saveDialog = () => {
    const name = cardDraft.name.trim();
    const streamUrl = cardDraft.streamUrl.trim();
    if (!name || !streamUrl) {
      toast.error("الاسم ورابط البث مطلوبان");
      return;
    }
    const payload: Omit<StreamerEntry, "id"> = {
      name,
      role: cardDraft.role.trim() || "صانع محتوى معتمد",
      bio: cardDraft.bio.trim(),
      streamUrl,
      image: cardDraft.image.trim() || STREAMER_PLACEHOLDER_IMAGE,
      hidden: !!editing.hidden,
    };
    if (editing.id) {
      update(editing.id, payload);
      appendActivityLog(user?.username ?? "—", "ستريمرز: تعديل", name);
      toast.success("تم حفظ التعديلات");
    } else {
      const id = add(payload);
      setSelectedId(id);
      appendActivityLog(user?.username ?? "—", "ستريمرز: إضافة", name);
      toast.success("تمت الإضافة");
    }
    setDialogOpen(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div className="flex flex-col gap-4 text-right sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center justify-end gap-2 font-display text-2xl font-bold text-slate-900">
            <Video className="h-7 w-7 text-rose-700" />
            ستريمر منجر — صنّاع المحتوى
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            أضف، عدّل، احذف، ورتّب البطاقات. الصور تُخزَّن في المتصفح (رفع يتحول إلى Data URL). التحديث يظهر في{" "}
            <a href="/streamers" target="_blank" rel="noreferrer" className="text-rose-700 underline-offset-4 hover:underline">
              /streamers
            </a>{" "}
            فوراً.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            onClick={() => setPageVisible("streamers", !visibility.pages.streamers)}
          >
            {visibility.pages.streamers ? "إخفاء صفحة الستريمرز" : "إظهار صفحة الستريمرز"}
          </Button>
          {hasPendingOrderChanges ? (
            <Button
              type="button"
              variant="outline"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
              onClick={() => {
                const working = items.map((x) => x.id);
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
            <Plus className="ms-1 h-4 w-4" /> صانع جديد
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-rose-200/80 bg-white/85 p-4 shadow-[0_18px_44px_-28px_rgba(127,29,29,0.45)]">
        <div className="text-right">
          <Label htmlFor="streamer-search" className="text-slate-700">بحث بالاسم أو رابط البث</Label>
          <Input
            id="streamer-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-1.5 border-rose-200 bg-rose-50/35 text-slate-900 placeholder:text-slate-400 focus-visible:ring-rose-400"
            placeholder="اكتب اسم الستريمر أو جزء من رابط البث..."
            autoComplete="off"
            dir="rtl"
          />
        </div>
        <p className="font-display text-xs tracking-wide text-slate-500">الترتيب (اسحب)</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={filteredItems.map((x) => x.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredItems.length > 0 ? (
                filteredItems.map((entry) => (
                  <SortableStreamerRow
                    key={entry.id}
                    entry={entry}
                    active={selectedId === entry.id}
                    onSelect={() => setSelectedId(entry.id)}
                    onEdit={() => openEdit(entry)}
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
          className="flex max-h-[min(90dvh,90svh)] w-[calc(100%-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/95 bg-white p-0 shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] dark:border-slate-600 dark:bg-slate-900 sm:w-full lg:max-w-5xl"
        >
          <div className="shrink-0 border-b border-rose-200 bg-[radial-gradient(ellipse_100%_120%_at_50%_0%,rgba(244,63,94,0.22),transparent_58%)] px-6 pb-4 pt-14 dark:border-slate-700 dark:bg-[radial-gradient(ellipse_100%_120%_at_50%_0%,rgba(139,92,246,0.12),transparent_55%)] sm:px-8 sm:pt-16">
            <DialogHeader className="space-y-1.5 text-right sm:text-right">
              <DialogTitle className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
                {editing.id ? "تعديل صانع محتوى" : "صانع محتوى جديد"}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                البيانات تُحفظ في المتصفح — عبّئ بيانات البث وارفع الصورة ثم احفظ.
              </DialogDescription>
            </DialogHeader>
            {editing.id ? (
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="ms-1 h-4 w-4" />
                  حذف الستريمر
                </Button>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-white px-6 py-5 dark:bg-slate-900 sm:px-8">
            <EditorDialogSection
              title="بيانات البطاقة"
              className="border-rose-200 bg-rose-50/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] [&>h3]:border-rose-200 [&>h3]:text-rose-700 dark:border-slate-600 dark:bg-slate-800/55 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:[&>h3]:border-slate-600 dark:[&>h3]:text-rose-300"
            >
              <StreamerCardEditFields
                value={cardDraft}
                onChange={setCardDraft}
                inputClassName={cn(
                  editorDialogInputClass,
                  "border-rose-200 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100",
                )}
                textareaClassName={cn(
                  editorDialogTextareaClass,
                  "border-rose-200 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100",
                )}
              />
            </EditorDialogSection>
          </div>

          <div className="shrink-0 border-t border-rose-200 bg-white/80 px-6 py-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 sm:px-8">
            <DialogFooter className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-start sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-200 dark:hover:bg-slate-700 sm:min-w-[7rem]"
                onClick={() => setEditing((prev) => ({ ...prev, hidden: !prev.hidden }))}
              >
                {editing.hidden ? "إظهار بالموقع" : "إخفاء من الموقع"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-200 dark:hover:bg-slate-700 sm:min-w-[7rem]"
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
        <AlertDialogContent
          dir="rtl"
          className="border-slate-200 bg-white text-slate-900 shadow-xl dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 sm:rounded-2xl"
        >
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="dark:text-slate-50">حذف {editing.name || "الستريمر"}؟</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-400">
              سيتم حذف العنصر نهائياً من القائمة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!editing.id) return;
                appendActivityLog(user?.username ?? "—", "ستريمرز: حذف", editing.name || editing.id);
                remove(editing.id);
                setSelectedId((prev) => (prev === editing.id ? null : prev));
                setDeleteConfirmOpen(false);
                setDialogOpen(false);
                toast.success("تم حذف الستريمر");
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

export default StreamersEditorPage;
