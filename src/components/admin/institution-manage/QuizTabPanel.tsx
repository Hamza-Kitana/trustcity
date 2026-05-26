import { CheckCircle2, HelpCircle, Pencil, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { QuizQuestion } from "@/data/lawsQuiz";
import { cn } from "@/lib/utils";

type Props = {
  quizDraft: QuizQuestion[];
  onAdd: () => void;
  onEdit: (q: QuizQuestion) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  saving: boolean;
};

export function QuizTabPanel({ quizDraft, onAdd, onEdit, onDelete, onSave, saving }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-rose-200/80 bg-gradient-to-l from-rose-50 via-white to-red-50/40 p-4 dark:border-rose-800/50 dark:from-rose-950/40 dark:via-slate-900 dark:to-red-950/20">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-500/30">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">أسئلة إقرار القوانين</p>
            <p className="mt-0.5 max-w-md text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              تظهر للمتقدم بعد قراءة القوانين — يجب الإجابة الصحيحة على الكل للمتابعة.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onAdd}
          className="gap-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700"
        >
          <Plus className="h-4 w-4" />
          إضافة سؤال
        </Button>
      </div>

      {quizDraft.length === 0 ? (
        <Card className="border-dashed border-rose-200 bg-rose-50/30 dark:border-rose-800 dark:bg-rose-950/20">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <HelpCircle className="h-7 w-7" />
            </span>
            <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">لا توجد أسئلة بعد</p>
            <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
              اضغط «إضافة سؤال» — يُحفظ السؤال فور تأكيده في النافذة.
            </p>
            <Button type="button" size="sm" onClick={onAdd} className="mt-1 gap-1.5 bg-rose-600 text-white hover:bg-rose-700">
              <Plus className="h-4 w-4" />
              إضافة سؤال
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quizDraft.map((q, index) => {
            const correctOpt = q.options.find((o) => o.id === q.correctOptionId);
            return (
              <Card
                key={q.id}
                className="overflow-hidden border-slate-200/90 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-600 dark:bg-slate-900/95"
              >
                <CardContent className="p-0">
                  <div className="flex flex-wrap items-stretch gap-0">
                    <div className="flex w-12 shrink-0 items-center justify-center bg-rose-600 font-display text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
                          {q.question.trim() || "— بدون نص —"}
                        </p>
                        <div className="flex shrink-0 gap-1.5">
                          <Button type="button" size="sm" variant="outline" onClick={() => onEdit(q)} className="gap-1 rounded-lg">
                            <Pencil className="h-3.5 w-3.5" />
                            تعديل
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={quizDraft.length <= 1}
                            onClick={() => onDelete(q.id)}
                            className="rounded-lg border-rose-200 text-rose-700 dark:border-rose-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = opt.id === q.correctOptionId;
                          return (
                            <span
                              key={opt.id}
                              className={cn(
                                "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]",
                                isCorrect
                                  ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
                              )}
                            >
                              <span className="font-semibold opacity-70">{String.fromCharCode(65 + optIdx)}</span>
                              <span className="truncate">{opt.label.trim() || "—"}</span>
                              {isCorrect ? <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" /> : null}
                            </span>
                          );
                        })}
                      </div>
                      {correctOpt?.label ? (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                          الإجابة المعتمدة: <span className="font-semibold">{correctOpt.label}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-0 flex justify-end rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="gap-2 rounded-xl bg-gradient-to-l from-rose-700 to-rose-600 px-6 text-white shadow-md hover:from-rose-800 hover:to-rose-700"
        >
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ…" : "حفظ الأسئلة"}
        </Button>
      </div>
    </div>
  );
}
