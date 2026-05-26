import { useEffect, useState } from "react";
import { idbGetTicketBlob } from "@/lib/ticketAttachmentsIdb";
import type { TicketAttachment } from "@/lib/ticketsCenter";
import { cn } from "@/lib/utils";

export type TicketAttachmentChatVariant = "ticketsUser" | "ticketsStaff" | "dashCustomer" | "dashStaff";

const linkTone: Record<TicketAttachmentChatVariant, string> = {
  ticketsUser:
    "border-white/30 bg-white/10 text-rose-100 hover:bg-white/15",
  ticketsStaff:
    "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-200 dark:hover:bg-slate-700",
  dashCustomer:
    "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-slate-600 dark:bg-slate-800 dark:text-rose-200 dark:hover:bg-slate-700",
  dashStaff:
    "border-rose-300 bg-white/80 text-rose-900 hover:bg-rose-50 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-100 dark:hover:bg-rose-950/70",
};

const videoBorder: Record<TicketAttachmentChatVariant, string> = {
  ticketsUser: "border-white/30",
  ticketsStaff: "border-rose-200 dark:border-slate-600",
  dashCustomer: "border-rose-200 dark:border-slate-600",
  dashStaff: "border-rose-300 dark:border-rose-600",
};

type Props = {
  att: TicketAttachment;
  variant: TicketAttachmentChatVariant;
};

export function TicketChatAttachmentMedia({ att, variant }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(att.dataUrl ?? null);
  const isVideo = att.mimeType.startsWith("video/");

  useEffect(() => {
    if (att.dataUrl) {
      setObjectUrl(att.dataUrl);
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    const load = async () => {
      if (!att.blobStoreId) return;
      const blob = await idbGetTicketBlob(att.blobStoreId);
      if (!blob || cancelled) return;
      createdUrl = URL.createObjectURL(blob);
      setObjectUrl(createdUrl);
    };
    void load();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [att.dataUrl, att.blobStoreId]);

  const linkCls = cn("rounded-md border px-2 py-1", linkTone[variant]);

  if (!objectUrl) {
    return <p className="text-[11px] text-rose-200/90 dark:text-slate-400">جارٍ تحميل المرفق…</p>;
  }

  if (isVideo) {
    return (
      <div className="space-y-1">
        <a href={objectUrl} target="_blank" rel="noreferrer" className="block">
          <video
            controls
            className={cn("max-h-56 rounded-lg border bg-black/10", videoBorder[variant])}
            preload="metadata"
          >
            <source src={objectUrl} type={att.mimeType} />
          </video>
        </a>
        <div className="flex flex-wrap justify-end gap-2 text-[11px]">
          <a href={objectUrl} target="_blank" rel="noreferrer" className={linkCls}>
            فتح
          </a>
          <a href={objectUrl} download={att.name} className={linkCls}>
            تنزيل
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <a href={objectUrl} target="_blank" rel="noreferrer" className="block">
        <img
          src={objectUrl}
          alt={att.name}
          className={cn(
            "max-h-56 cursor-zoom-in rounded-lg border object-contain",
            variant === "ticketsUser" ? "border-white/20" : "border-rose-200 dark:border-slate-600",
          )}
        />
      </a>
      <div className="flex flex-wrap justify-end gap-2 text-[11px]">
        <a href={objectUrl} target="_blank" rel="noreferrer" className={linkCls}>
          فتح
        </a>
        <a href={objectUrl} download={att.name} className={linkCls}>
          تنزيل
        </a>
      </div>
    </div>
  );
}
