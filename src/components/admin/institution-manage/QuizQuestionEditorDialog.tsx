import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuizQuestion } from "@/data/lawsQuiz";
import { QUIZ_OPTION_IDS } from "@/lib/quizQuestionUtils";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  mode: "add" | "edit";
  draft: QuizQuestion | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onPatchQuestion: (patch: Partial<QuizQuestion>) => void;
  onPatchOption: (optionId: string, label: string) => void;
  onAddOption: () => void;
  onRemoveOption: (optionId: string) => void;
};

export function QuizQuestionEditorDialog({
  open,
  mode,
  draft,
  onOpenChange,
  onConfirm,
  onPatchQuestion,
  onPatchOption,
  onAddOption,
  onRemoveOption,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="flex max-h-[min(90dvh,90svh)] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200/95 bg-white p-0 text-right text-slate-900 shadow-[0_28px_72px_-24px_rgba(15,23,42,0.38)] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 sm:w-full"
      >
        <div className="shrink-0 border-b border-rose-200 bg-[radial-gradient(ellipse_100%_120%_at_50%_0%,rgba(139,92,246,0.18),transparent_58%)] px-5 pb-4 pt-12 dark:border-slate-700 dark:bg-[radial-gradient(ellipse_100%_120%_at_50%_0%,rgba(139,92,246,0.1),transparent_55%)] sm:px-6 sm:pt-14">
          <DialogHeader className="space-y-1.5 text-right sm:text-right">
            <DialogTitle className="font-display text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              {mode === "edit" ? "تعديل السؤال" : "إضافة سؤال جديد"}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              اكتب نص السؤال، أضف الخيارات، ثم اضغط «صحيح» بجانب الإجابة الصحيحة.
            </DialogDescription>
          </DialogHeader>
        </div>

        {draft ? (
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-white px-5 py-5 dark:bg-slate-900 sm:px-6">
            <div className="space-y-2 text-right">
              <Label className="text-slate-800 dark:text-slate-200">نص السؤال</Label>
              <Textarea
                value={draft.question}
                onChange={(e) => onPatchQuestion({ question: e.target.value })}
                className="min-h-24 rounded-xl border-slate-200 bg-white text-right text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                placeholder="اكتب السؤال هنا..."
              />
            </div>

            <div className="space-y-3 text-right">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-slate-800 dark:text-slate-200">الخيارات والإجابة الصحيحة</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddOption}
                  disabled={draft.options.length >= QUIZ_OPTION_IDS.length}
                  className="h-8 gap-1 rounded-full border-rose-200 bg-rose-50 text-xs text-rose-800 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  خيار
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اضغط «صحيح» بجانب الإجابة الصحيحة — يُظلَّل الخيار بالأخضر.
              </p>
              <div className="space-y-2">
                {draft.options.map((opt, optIdx) => {
                  const isCorrect = draft.correctOptionId === opt.id;
                  return (
                    <div
                      key={opt.id}
                      className={cn(
                        "flex flex-wrap items-center gap-2 rounded-xl border p-2.5",
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
                          : "border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900/80",
                      )}
                    >
                      <span className="w-8 shrink-0 text-center font-display text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <Input
                        value={opt.label}
                        onChange={(e) => onPatchOption(opt.id, e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border-slate-200 bg-white text-right dark:border-slate-600 dark:bg-slate-950"
                        placeholder={`نص الخيار ${String.fromCharCode(65 + optIdx)}`}
                      />
                      <Button
                        type="button"
                        variant={isCorrect ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPatchQuestion({ correctOptionId: opt.id })}
                        className={cn(
                          "shrink-0 gap-1 rounded-lg",
                          isCorrect
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
                        )}
                      >
                        {isCorrect ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                        صحيح
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={draft.options.length <= 2}
                        onClick={() => onRemoveOption(opt.id)}
                        className="shrink-0 rounded-lg border-rose-200 text-rose-700 dark:border-rose-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-800 dark:text-slate-200">شرح (اختياري)</Label>
              <Textarea
                value={draft.explanation ?? ""}
                onChange={(e) => onPatchQuestion({ explanation: e.target.value })}
                className="min-h-16 rounded-xl border-slate-200 bg-white text-right dark:border-slate-600 dark:bg-slate-950"
                placeholder="يظهر للمستخدم بعد إجابة خاطئة..."
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="shrink-0 flex-row-reverse gap-2 border-t border-slate-200 bg-slate-50/90 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/95 sm:justify-start sm:px-6">
          <Button type="button" onClick={onConfirm} className="rounded-xl bg-rose-600 text-white hover:bg-rose-700">
            {mode === "edit" ? "حفظ التعديل" : "إضافة السؤال"}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
