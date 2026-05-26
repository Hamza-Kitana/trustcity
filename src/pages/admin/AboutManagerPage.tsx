import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical, Plus, Save, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { appendActivityLog } from "@/lib/activityLog";
import {
  createAboutPillar,
  loadAboutPageContent,
  saveAboutPageContent,
  type AboutPageContent,
  type AboutPillar,
} from "@/lib/aboutPageContent";
import { listenStorageSync } from "@/lib/storageSync";
import { adminInput } from "@/lib/adminUi";

const ABOUT_PAGE_STORAGE_KEY = "ic_about_page_content_v1";
const ABOUT_PAGE_CHANGED_EVENT = "ic-about-page-content";

const inputClassName = adminInput;
const textareaClassName = cn(adminInput, "min-h-[96px]");

function SortablePillarEditor({
  pillar,
  displayIndex,
  onTitleChange,
  onBodyChange,
  onRemove,
}: {
  pillar: AboutPillar;
  displayIndex: number;
  onTitleChange: (next: string) => void;
  onBodyChange: (next: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pillar.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-slate-200 bg-rose-50/35 p-4 transition-shadow",
        isDragging && "z-20 opacity-95 shadow-lg ring-2 ring-rose-300/60",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-500 cursor-grab touch-manipulation active:cursor-grabbing"
            aria-label="سحب لإعادة الترتيب"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <p className="font-display text-sm text-rose-700">ميزة {displayIndex + 1}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl" className="border-slate-200 bg-white text-slate-900 shadow-xl sm:rounded-2xl">
            <AlertDialogHeader className="text-right">
              <AlertDialogTitle>حذف هذه الميزة؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم إزالة «{pillar.title.trim() || "الميزة"}» من القائمة بعد الحفظ.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:justify-start">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onRemove}>
                تأكيد الحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700">العنوان</Label>
        <Input value={pillar.title} onChange={(e) => onTitleChange(e.target.value)} className={inputClassName} />
      </div>
      <div className="mt-3 space-y-2">
        <Label className="text-slate-700">الوصف</Label>
        <Textarea value={pillar.body} onChange={(e) => onBodyChange(e.target.value)} className={textareaClassName} />
      </div>
    </div>
  );
}

const AboutManagerPage = () => {
  const { user } = useAuth();
  const [draft, setDraft] = useState<AboutPageContent>(() => loadAboutPageContent());
  const [savedSnapshot, setSavedSnapshot] = useState<AboutPageContent>(() => loadAboutPageContent());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedSnapshot);

  useEffect(() => {
    return listenStorageSync(
      ABOUT_PAGE_STORAGE_KEY,
      () => {
        const fresh = loadAboutPageContent();
        setDraft(fresh);
        setSavedSnapshot(fresh);
      },
      [ABOUT_PAGE_CHANGED_EVENT],
    );
  }, []);

  const setField = <K extends keyof AboutPageContent>(key: K, value: AboutPageContent[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const setPillarField = (id: string, key: "title" | "body", value: string) => {
    setDraft((prev) => ({
      ...prev,
      pillars: prev.pillars.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    }));
  };

  const removePillar = (id: string) => {
    setDraft((prev) => ({ ...prev, pillars: prev.pillars.filter((p) => p.id !== id) }));
  };

  const addPillar = () => {
    setDraft((prev) => ({ ...prev, pillars: [...prev.pillars, createAboutPillar()] }));
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDraft((prev) => {
      const oldIndex = prev.pillars.findIndex((p) => p.id === active.id);
      const newIndex = prev.pillars.findIndex((p) => p.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, pillars: arrayMove(prev.pillars, oldIndex, newIndex) };
    });
  };

  const handleSave = () => {
    saveAboutPageContent(draft);
    setSavedSnapshot(draft);
    appendActivityLog(user?.username ?? "admin", "تحديث صفحة من نحن", "تم حفظ محتوى صفحة من نحن");
    toast.success("تم حفظ تعديلات صفحة من نحن");
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="text-right">
            <h1 className="font-display text-2xl font-bold text-slate-900">مدير من نحن</h1>
            <p className="mt-1 text-sm text-slate-600">عدّل كل نصوص صفحة من نحن مباشرة من لوحة التحكم.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <Link to="/contact" target="_blank" rel="noreferrer">
                <ExternalLink className="ms-2 h-4 w-4" />
                معاينة الصفحة
              </Link>
            </Button>
            <Button type="button" className="bg-[#36164f] text-white hover:bg-[#2f1344]" onClick={handleSave}>
              <Save className="ms-2 h-4 w-4" />
              حفظ التغييرات
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-right font-display text-lg font-semibold text-slate-900">الهيدر</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">نص أعلى العنوان</Label>
              <Input value={draft.heroEyebrow} onChange={(e) => setField("heroEyebrow", e.target.value)} className={inputClassName} />
            </div>
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">العنوان (جزء 1)</Label>
              <Input value={draft.heroTitleA} onChange={(e) => setField("heroTitleA", e.target.value)} className={inputClassName} />
            </div>
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">العنوان (جزء 2)</Label>
              <Input value={draft.heroTitleB} onChange={(e) => setField("heroTitleB", e.target.value)} className={inputClassName} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-right font-display text-lg font-semibold text-slate-900">قسم من نحن</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">الوسم الصغير</Label>
              <Input value={draft.aboutEyebrow} onChange={(e) => setField("aboutEyebrow", e.target.value)} className={inputClassName} />
            </div>
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">العنوان</Label>
              <Input value={draft.aboutTitle} onChange={(e) => setField("aboutTitle", e.target.value)} className={inputClassName} />
            </div>
            <div className="space-y-2 text-right sm:col-span-2">
              <Label className="text-slate-700">الوصف</Label>
              <Textarea value={draft.aboutBody} onChange={(e) => setField("aboutBody", e.target.value)} className={textareaClassName} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-right font-display text-lg font-semibold text-slate-900">رؤيتنا وكيف نعمل</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-rose-50/35 p-4">
              <div className="space-y-2 text-right">
                <Label className="text-slate-700">عنوان الرؤية</Label>
                <Input value={draft.visionTitle} onChange={(e) => setField("visionTitle", e.target.value)} className={inputClassName} />
              </div>
              <div className="mt-3 space-y-2 text-right">
                <Label className="text-slate-700">وصف الرؤية</Label>
                <Textarea value={draft.visionBody} onChange={(e) => setField("visionBody", e.target.value)} className={textareaClassName} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-rose-50/35 p-4">
              <div className="space-y-2 text-right">
                <Label className="text-slate-700">عنوان كيف نعمل</Label>
                <Input value={draft.workTitle} onChange={(e) => setField("workTitle", e.target.value)} className={inputClassName} />
              </div>
              <div className="mt-3 space-y-2 text-right">
                <Label className="text-slate-700">وصف كيف نعمل</Label>
                <Textarea value={draft.workBody} onChange={(e) => setField("workBody", e.target.value)} className={textareaClassName} />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-right font-display text-lg font-semibold text-slate-900">قسم المميزات</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">عنوان القسم</Label>
              <Input value={draft.featuresTitle} onChange={(e) => setField("featuresTitle", e.target.value)} className={inputClassName} />
            </div>
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">وصف القسم</Label>
              <Input
                value={draft.featuresSubtitle}
                onChange={(e) => setField("featuresSubtitle", e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>
          <p className="mt-4 text-right font-display text-xs tracking-wide text-slate-500">الترتيب (اسحب بالمقبض) · إضافة وحذف الميزات</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={draft.pillars.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="mt-3 space-y-3">
                {draft.pillars.length > 0 ? (
                  draft.pillars.map((pillar, index) => (
                    <SortablePillarEditor
                      key={pillar.id}
                      pillar={pillar}
                      displayIndex={index}
                      onTitleChange={(next) => setPillarField(pillar.id, "title", next)}
                      onBodyChange={(next) => setPillarField(pillar.id, "body", next)}
                      onRemove={() => removePillar(pillar.id)}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-4 py-8 text-center text-sm text-slate-600">
                    لا توجد ميزات بعد. اضغط «إضافة ميزة» أدناه.
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800 sm:w-auto"
            onClick={addPillar}
          >
            <Plus className="ms-2 h-4 w-4" />
            إضافة ميزة
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-right font-display text-lg font-semibold text-slate-900">قسم الديسكورد</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">العنوان</Label>
              <Input value={draft.discordTitle} onChange={(e) => setField("discordTitle", e.target.value)} className={inputClassName} />
            </div>
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">نص زر الديسكورد</Label>
              <Input
                value={draft.discordButtonLabel}
                onChange={(e) => setField("discordButtonLabel", e.target.value)}
                className={inputClassName}
              />
            </div>
            <div className="space-y-2 text-right sm:col-span-2">
              <Label className="text-slate-700">الوصف</Label>
              <Textarea value={draft.discordBody} onChange={(e) => setField("discordBody", e.target.value)} className={textareaClassName} />
            </div>
            <div className="space-y-2 text-right sm:col-span-2">
              <Label className="text-slate-700">ملاحظة أسفل القسم</Label>
              <Textarea
                value={draft.discordFootnote}
                onChange={(e) => setField("discordFootnote", e.target.value)}
                className={textareaClassName}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-right font-display text-lg font-semibold text-slate-900">الصندوق الختامي</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">العنوان</Label>
              <Input value={draft.ctaTitle} onChange={(e) => setField("ctaTitle", e.target.value)} className={inputClassName} />
            </div>
            <div className="space-y-2 text-right">
              <Label className="text-slate-700">نص الزر</Label>
              <Input value={draft.ctaButtonLabel} onChange={(e) => setField("ctaButtonLabel", e.target.value)} className={inputClassName} />
            </div>
            <div className="space-y-2 text-right sm:col-span-2">
              <Label className="text-slate-700">الوصف</Label>
              <Textarea value={draft.ctaBody} onChange={(e) => setField("ctaBody", e.target.value)} className={textareaClassName} />
            </div>
          </div>
        </div>
      </div>

      {isDirty ? (
        <p className="text-right text-xs text-amber-700">يوجد تغييرات غير محفوظة. اضغط حفظ التغييرات لتطبيقها على صفحة من نحن.</p>
      ) : null}
    </section>
  );
};

export default AboutManagerPage;
