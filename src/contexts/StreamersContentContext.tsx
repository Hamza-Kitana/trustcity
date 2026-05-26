import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultStreamersPersisted } from "@/data/streamersDefaultState";
import {
  applicationToStreamerPayload,
  type StreamerCardDraftOverrides,
} from "@/lib/streamerApplication";
import type { ApplicationRecord } from "@/data/publicApplicationTypes";
import type { StreamerEntry, StreamersPersisted } from "@/types/streamersSchema";
import { listenStorageSync, writeSyncedLocalStorage } from "@/lib/storageSync";

const STORAGE_KEY = "ic_streamers_v2";

function loadPersisted(): StreamersPersisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStreamersPersisted();
    const p = JSON.parse(raw) as StreamersPersisted;
    if (p?.v === 1 && Array.isArray(p.items)) {
      return p;
    }
  } catch {
    /* fallback */
  }
  return defaultStreamersPersisted();
}

function savePersisted(data: StreamersPersisted) {
  writeSyncedLocalStorage(STORAGE_KEY, JSON.stringify(data));
}

type StreamersContentValue = {
  items: StreamerEntry[];
  resetToDefaults: () => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  add: (entry: Omit<StreamerEntry, "id">) => string;
  update: (id: string, patch: Partial<Omit<StreamerEntry, "id">>) => void;
  remove: (id: string) => void;
  /** إضافة أو تحديث بطاقة من طلب مقبول — يمنع التكرار عبر linkedUserId */
  upsertFromApplication: (
    app: ApplicationRecord,
    cardRole?: string,
    draft?: StreamerCardDraftOverrides,
  ) => string;
};

const StreamersContentContext = createContext<StreamersContentValue | null>(null);

export function StreamersContentProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useState<StreamersPersisted>(() => loadPersisted());

  useEffect(() => {
    return listenStorageSync(STORAGE_KEY, () => setPersisted(loadPersisted()));
  }, []);

  const resetToDefaults = useCallback(() => {
    const next = defaultStreamersPersisted();
    savePersisted(next);
    setPersisted(next);
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setPersisted((prev) => {
      const items = [...prev.items];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      const next = { ...prev, items };
      savePersisted(next);
      return next;
    });
  }, []);

  const add = useCallback((entry: Omit<StreamerEntry, "id">) => {
    const id = crypto.randomUUID();
    setPersisted((prev) => {
      const next = { ...prev, items: [...prev.items, { ...entry, id }] };
      savePersisted(next);
      return next;
    });
    return id;
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<StreamerEntry, "id">>) => {
    setPersisted((prev) => {
      const items = prev.items.map((x) => (x.id === id ? { ...x, ...patch } : x));
      const next = { ...prev, items };
      savePersisted(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setPersisted((prev) => {
      const next = { ...prev, items: prev.items.filter((x) => x.id !== id) };
      savePersisted(next);
      return next;
    });
  }, []);

  const upsertFromApplication = useCallback(
    (app: ApplicationRecord, cardRole?: string, draft?: StreamerCardDraftOverrides) => {
    const payload = applicationToStreamerPayload(app, { cardRole, draft });
    const linkedId = payload.linkedUserId;
    let resultId = "";
    setPersisted((prev) => {
      const existingIdx =
        linkedId != null && linkedId.length > 0
          ? prev.items.findIndex((x) => x.linkedUserId === linkedId)
          : -1;
      if (existingIdx >= 0) {
        const id = prev.items[existingIdx]!.id;
        resultId = id;
        const items = prev.items.map((x, i) => (i === existingIdx ? { ...x, ...payload, id } : x));
        const next = { ...prev, items };
        savePersisted(next);
        return next;
      }
      const id = crypto.randomUUID();
      resultId = id;
      const next = { ...prev, items: [...prev.items, { ...payload, id }] };
      savePersisted(next);
      return next;
    });
    return resultId;
  },
  []);

  const value = useMemo<StreamersContentValue>(
    () => ({
      items: persisted.items,
      resetToDefaults,
      reorder,
      add,
      update,
      remove,
      upsertFromApplication,
    }),
    [persisted.items, resetToDefaults, reorder, add, update, remove, upsertFromApplication],
  );

  return (
    <StreamersContentContext.Provider value={value}>{children}</StreamersContentContext.Provider>
  );
}

export function useStreamersContent(): StreamersContentValue {
  const ctx = useContext(StreamersContentContext);
  if (!ctx) throw new Error("useStreamersContent يجب أن يُستخدم داخل StreamersContentProvider");
  return ctx;
}
