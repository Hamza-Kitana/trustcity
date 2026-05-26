import { Plus, Save, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { JobRoleLawSet } from "@/data/jobRoleLaws";

type Props = {
  lawsDraft: JobRoleLawSet;
  onChange: (next: JobRoleLawSet) => void;
  onSave: () => void;
  saving: boolean;
};

export function LawsTabPanel({ lawsDraft, onChange, onSave, saving }: Props) {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-l from-rose-600 via-rose-700 to-indigo-800 p-5 text-white shadow-lg shadow-rose-500/20 dark:border-rose-500/40">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <Scale className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-display text-[10px] tracking-[0.28em] text-rose-200/90">معاينة للمتقدم</p>
            <p className="font-display text-lg font-bold leading-snug">
              {lawsDraft.title.trim() || "عنوان القوانين"}
            </p>
            <p className="text-sm leading-relaxed text-rose-100/95">
              {lawsDraft.subtitle.trim() || "وصف مختصر يظهر تحت العنوان في نموذج التقديم"}
            </p>
          </div>
        </div>
      </div>

      <Card className="border-slate-200/90 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900/95">
        <CardContent className="space-y-4 p-5">
          <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">بيانات العرض</p>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">عنوان القوانين</Label>
              <Input
                value={lawsDraft.title}
                onChange={(e) => onChange({ ...lawsDraft, title: e.target.value })}
                className="rounded-xl border-slate-200 bg-slate-50/50 text-right focus-visible:ring-rose-400 dark:border-slate-600 dark:bg-slate-950"
                placeholder="مثال: قوانين وزارة الصحة"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">وصف مختصر</Label>
              <Input
                value={lawsDraft.subtitle}
                onChange={(e) => onChange({ ...lawsDraft, subtitle: e.target.value })}
                className="rounded-xl border-slate-200 bg-slate-50/50 text-right focus-visible:ring-rose-400 dark:border-slate-600 dark:bg-slate-950"
                placeholder="جملة تمهيدية للمتقدم..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">بنود القوانين</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lawsDraft.rules.length} بند — يُحفظ تلقائياً عند اكتمال العنوان وبند واحد على الأقل
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-full border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
            onClick={() => onChange({ ...lawsDraft, rules: [...lawsDraft.rules, ""] })}
          >
            <Plus className="h-3.5 w-3.5" />
            إضافة بند
          </Button>
        </div>
        <div className="space-y-3">
          {lawsDraft.rules.map((rule, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-600 dark:bg-slate-900/90"
            >
              <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-rose-500 to-red-500" />
              <div className="flex gap-3 p-4 pr-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 font-display text-sm font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <Textarea
                    value={rule}
                    onChange={(e) => {
                      const rules = [...lawsDraft.rules];
                      rules[idx] = e.target.value;
                      onChange({ ...lawsDraft, rules });
                    }}
                    className="min-h-[80px] resize-y rounded-xl border-slate-200 bg-slate-50/40 text-right text-sm leading-relaxed focus-visible:ring-rose-400 dark:border-slate-600 dark:bg-slate-950"
                    placeholder="اكتب نص البند أو القاعدة..."
                  />
                  {rule.trim() ? (
                    <p className="rounded-lg bg-rose-50/80 px-3 py-2 text-xs leading-relaxed text-slate-700 dark:bg-rose-950/30 dark:text-slate-300">
                      <span className="font-semibold text-rose-700 dark:text-rose-300">معاينة: </span>
                      {rule.trim()}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={lawsDraft.rules.length <= 1}
                  onClick={() => onChange({ ...lawsDraft, rules: lawsDraft.rules.filter((_, i) => i !== idx) })}
                  className="h-9 w-9 shrink-0 self-start rounded-xl border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 flex justify-end rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
        <Button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="gap-2 rounded-xl bg-gradient-to-l from-rose-700 to-rose-600 px-6 text-white shadow-md hover:from-rose-800 hover:to-rose-700"
        >
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ…" : "حفظ القوانين"}
        </Button>
      </div>
    </div>
  );
}
