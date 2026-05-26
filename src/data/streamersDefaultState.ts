import type { StreamersPersisted } from "@/types/streamersSchema";

/** قائمة فارغة — تُعبَّأ لاحقاً من لوحة الإدارة أو طلبات القبول */
export function defaultStreamersPersisted(): StreamersPersisted {
  return { v: 1, items: [] };
}
