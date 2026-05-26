import { useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TicketAttachment } from "@/lib/ticketsCenter";
import {
  formatFileSize,
  readTicketAttachmentFromFile,
  revokePendingTicketAttachment,
  TICKET_ATTACHMENT_INLINE_MAX_BYTES,
} from "@/lib/ticketAttachmentRead";

const ACCEPT_EXT = /\.(jpe?g|png|gif|webp|bmp|mp4|webm|mov|m4v|mkv)$/i;

function isImageOrVideoFile(file: File): boolean {
  if (file.type.startsWith("image/") || file.type.startsWith("video/")) return true;
  return ACCEPT_EXT.test(file.name);
}

type Props = {
  value: TicketAttachment | null;
  onChange: (next: TicketAttachment | null) => void;
  className?: string;
  /** واجهة الزائر (فاتح) أو لوحة الإدارة (داكن/فاتح مختلط) */
  variant?: "public" | "admin";
};

export function TicketAttachmentPicker({ value, onChange, className, variant = "public" }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickCls =
    variant === "admin"
      ? "border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-100 dark:hover:bg-slate-700"
      : "border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100";

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClear = async () => {
    await revokePendingTicketAttachment(value);
    onChange(null);
    resetInput();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!isImageOrVideoFile(f)) {
      toast.error("يُسمح بصور ومقاطع فيديو فقط.");
      return;
    }
    await revokePendingTicketAttachment(value);
    setLoading(true);
    setProgress(0);
    try {
      const att = await readTicketAttachmentFromFile(f, { onProgress: setProgress });
      onChange(att);
    } catch {
      toast.error("تعذّر قراءة الملف. جرّب ملفًا آخر أو حجمًا أصغر.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input ref={inputRef} type="file" accept="image/*,video/*" className="sr-only" onChange={handleFile} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          className={cn("gap-2 font-medium", pickCls)}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Paperclip className="h-4 w-4 shrink-0" />}
          {loading ? `جاري التحضير ${Math.round(progress * 100)}%` : "إرفاق صورة أو فيديو"}
        </Button>
        {value && !loading ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
            onClick={() => void handleClear()}
          >
            <X className="ms-1 h-4 w-4" />
            إلغاء المرفق
          </Button>
        ) : null}
      </div>
      {value && !loading ? (
        <p className="text-right text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-800 dark:text-slate-200">{value.name}</span>
          {value.blobStoreId ? (
            <span className="me-1 text-rose-600 dark:text-rose-400"> — تخزين محلي للملف الكبير</span>
          ) : null}
        </p>
      ) : null}
      <p className="text-right text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
        حتى {formatFileSize(TICKET_ATTACHMENT_INLINE_MAX_BYTES)} يُحفظ مع التكت؛ الأكبر يُخزَّن في المتصفح (IndexedDB) لتفادي امتلاء التخزين.
      </p>
    </div>
  );
}
