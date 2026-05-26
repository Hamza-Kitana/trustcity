import { useEffect, useMemo, useState } from "react";
import { INSTITUTION_BRANCH_IDS, type InstitutionBranchId } from "@/data/institutionBranches";

const STORAGE_KEY = "ic_site_visibility_v1";
const EVENT_NAME = "ic-site-visibility";
/** يُفعَّل مرة واحدة بعد إعادة تفعيل صفحة صنّاع المحتوى */
const STREAMERS_RESTORED_KEY = "ic_streamers_page_restored_v1";

export type SitePageKey = "laws" | "streamers" | "gangs" | "vipCars" | "houses" | "packages" | "investments";

type SiteVisibilityPersisted = {
  v: 1;
  pages: Record<SitePageKey, boolean>;
  institutions: Record<InstitutionBranchId, boolean>;
};

function defaultState(): SiteVisibilityPersisted {
  return {
    v: 1,
    pages: {
      laws: true,
      streamers: true,
      gangs: true,
      vipCars: true,
      houses: true,
      packages: true,
      investments: true,
    },
    institutions: Object.fromEntries(
      INSTITUTION_BRANCH_IDS.map((id) => [id, true]),
    ) as Record<InstitutionBranchId, boolean>,
  };
}

function hydrate(raw: unknown): SiteVisibilityPersisted {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Partial<SiteVisibilityPersisted>;
  return {
    v: 1,
    pages: { ...base.pages, ...(p.pages ?? {}) },
    institutions: { ...base.institutions, ...(p.institutions ?? {}) },
  };
}

export function loadSiteVisibility(): SiteVisibilityPersisted {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const loaded = raw ? hydrate(JSON.parse(raw)) : defaultState();
    if (!localStorage.getItem(STREAMERS_RESTORED_KEY)) {
      localStorage.setItem(STREAMERS_RESTORED_KEY, "1");
      if (!loaded.pages.streamers) {
        const fixed = { ...loaded, pages: { ...loaded.pages, streamers: true } };
        saveSiteVisibility(fixed);
        return fixed;
      }
    }
    return loaded;
  } catch {
    return defaultState();
  }
}

function saveSiteVisibility(next: SiteVisibilityPersisted) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function setPageVisible(page: SitePageKey, visible: boolean) {
  const current = loadSiteVisibility();
  saveSiteVisibility({ ...current, pages: { ...current.pages, [page]: visible } });
}

export function setInstitutionVisible(id: InstitutionBranchId, visible: boolean) {
  const current = loadSiteVisibility();
  saveSiteVisibility({
    ...current,
    institutions: { ...current.institutions, [id]: visible },
  });
}

export function useSiteVisibility() {
  const [state, setState] = useState<SiteVisibilityPersisted>(() => loadSiteVisibility());

  useEffect(() => {
    const sync = () => setState(loadSiteVisibility());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT_NAME, sync as EventListener);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT_NAME, sync as EventListener);
    };
  }, []);

  return useMemo(() => state, [state]);
}

