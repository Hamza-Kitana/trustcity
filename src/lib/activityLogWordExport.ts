import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ActivityLogEntry } from "@/lib/activityLog";

export type ActivityLogExportMeta = {
  exportedAtLabel: string;
  displayedCount: number;
  totalInStore: number;
  rangeLabel: string;
  activeFiltersCount: number;
};

const BRAND_FILL = "36164F";
const ALT_ROW_FILL = "F5F3FF";
const BORDER_COLOR = "C4B5FD";

function formatLogDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "وقت غير صالح";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function rtlParagraph(text: string, opts?: { bold?: boolean; sizeHalfPt?: number; color?: string }) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { after: 80 },
    children: [
      new TextRun({
        text: text || "—",
        bold: opts?.bold,
        size: opts?.sizeHalfPt,
        color: opts?.color,
        rightToLeft: true,
      }),
    ],
  });
}

function tableCell(
  text: string,
  opts?: { bold?: boolean; header?: boolean; shaded?: boolean; widthPct?: number },
) {
  const fill = opts?.header ? BRAND_FILL : opts?.shaded ? ALT_ROW_FILL : undefined;
  const color = opts?.header ? "FFFFFF" : "1E1B4B";
  return new TableCell({
    width: opts?.widthPct ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: text || "—",
            bold: opts?.bold ?? opts?.header,
            color,
            rightToLeft: true,
            size: opts?.header ? 22 : 20,
          }),
        ],
      }),
    ],
  });
}

function metaTable(meta: ActivityLogExportMeta) {
  const rows: [string, string][] = [
    ["تاريخ التصدير", meta.exportedAtLabel],
    ["عدد السجلات في الملف", `${meta.displayedCount} من أصل ${meta.totalInStore}`],
    ["نطاق الوقت", meta.rangeLabel],
    ["فلاتر نشطة", meta.activeFiltersCount > 0 ? String(meta.activeFiltersCount) : "لا يوجد"],
  ];
  return new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      left: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      right: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
    },
    rows: [
      new TableRow({
        children: [
          tableCell("البيان", { header: true, widthPct: 28 }),
          tableCell("القيمة", { header: true, widthPct: 72 }),
        ],
      }),
      ...rows.map(
        ([label, value], i) =>
          new TableRow({
            children: [
              tableCell(label, { bold: true, shaded: i % 2 === 0, widthPct: 28 }),
              tableCell(value, { shaded: i % 2 === 0, widthPct: 72 }),
            ],
          }),
      ),
    ],
  });
}

function logDataTable(rows: ActivityLogEntry[]) {
  const header = ["م", "التاريخ والوقت", "الحساب", "الفعل / النشاط", "التفاصيل"];
  const widths = [6, 18, 16, 22, 38];

  const tableRows: TableRow[] = [
    new TableRow({
      children: header.map((h, i) => tableCell(h, { header: true, widthPct: widths[i] })),
    }),
  ];

  if (rows.length === 0) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 5,
            children: [
              rtlParagraph("لا توجد سجلات مطابقة للفلتر الحالي.", { sizeHalfPt: 22, color: "64748B" }),
            ],
          }),
        ],
      }),
    );
  } else {
    rows.forEach((entry, idx) => {
      const shaded = idx % 2 === 1;
      const detail = (entry.detail ?? "").trim() || "—";
      tableRows.push(
        new TableRow({
          children: [
            tableCell(String(idx + 1), { shaded, widthPct: widths[0] }),
            tableCell(formatLogDateTime(entry.at), { shaded, widthPct: widths[1] }),
            tableCell(entry.actor, { shaded, widthPct: widths[2] }),
            tableCell(entry.action, { shaded, widthPct: widths[3] }),
            tableCell(detail, { shaded, widthPct: widths[4] }),
          ],
        }),
      );
    });
  }

  return new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      left: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      right: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: BORDER_COLOR },
    },
    rows: tableRows,
  });
}

/** بناء مستند Word (.docx) مرتب باتجاه RTL لسجل النشاط */
export async function buildActivityLogWordDocument(
  entries: ActivityLogEntry[],
  meta: ActivityLogExportMeta,
): Promise<Blob> {
  const doc = new Document({
    features: { updateFields: true },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          new Paragraph({
            bidirectional: true,
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "سجل النشاط — TRUST CFW Hub",
                bold: true,
                size: 32,
                color: BRAND_FILL,
                rightToLeft: true,
              }),
            ],
          }),
          new Paragraph({
            bidirectional: true,
            alignment: AlignmentType.CENTER,
            spacing: { after: 320 },
            children: [
              new TextRun({
                text: "تصدير من لوحة التحكم (سوبر أدمن)",
                size: 22,
                color: "64748B",
                rightToLeft: true,
              }),
            ],
          }),
          rtlParagraph("ملخص التصدير", { bold: true, sizeHalfPt: 26, color: BRAND_FILL }),
          metaTable(meta),
          new Paragraph({ spacing: { before: 280, after: 160 } }),
          rtlParagraph("سجل الأحداث", { bold: true, sizeHalfPt: 26, color: BRAND_FILL }),
          logDataTable(entries),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function downloadActivityLogWord(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
