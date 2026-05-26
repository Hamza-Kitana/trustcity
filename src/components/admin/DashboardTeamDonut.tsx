import { useEffect, useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { UsersRound } from "lucide-react";
import { primaryStaffRole, type StaffRole } from "@/contexts/AuthContext";
import { SUPER_ADMIN_USERNAME } from "@/config/staffAuth";
import { isInstitutionRosterStaffRole } from "@/data/institutionBranches";
import { IC_ACTIVITY_LOG_CHANGED_EVENT, loadActivityLog } from "@/lib/activityLog";
import { DASHBOARD_LIVE_EVENT } from "@/lib/storageSync";
import { IC_MANAGED_STAFF_CHANGED_EVENT } from "@/staff/staffDirectory";
import { loadManagedUsers } from "@/staff/staffDirectory";
import { isTicketTypeRole } from "@/lib/ticketTypesConfig";
import { cn } from "@/lib/utils";

type CatKey = "leadership" | "content" | "commerce" | "tickets" | "institution" | "applications";

type SliceRow = {
  key: CatKey;
  name: string;
  fill: string;
  members: number;
  activity: number;
  value: number;
};

const CATEGORY_ORDER: {
  key: CatKey;
  label: string;
  fill: string;
}[] = [
  { key: "leadership", label: "إدارة عليا", fill: "hsl(45 93% 52%)" },
  { key: "content", label: "محتوى ومحررون", fill: "hsl(350 64% 40%)" },
  { key: "commerce", label: "متجر واقتصاد", fill: "hsl(188 94% 43%)" },
  { key: "tickets", label: "تكت ودعم", fill: "hsl(38 92% 50%)" },
  { key: "institution", label: "طواقم مؤسسات", fill: "hsl(158 64% 42%)" },
  { key: "applications", label: "مراجعة التقديمات", fill: "hsl(326 72% 56%)" },
];

function categoryKeyFromPrimary(primary: StaffRole): CatKey {
  if (primary === "super_admin") return "leadership";
  if (
    primary === "laws_editor" ||
    primary === "streamer_manager" ||
    primary === "gang_manager" ||
    primary === "about_manager"
  ) {
    return "content";
  }
  if (
    primary === "vip_cars_manager" ||
    primary === "houses_manager" ||
    primary === "packages_manager" ||
    primary === "investments_manager" ||
    primary === "store_orders_manager"
  ) {
    return "commerce";
  }
  if (isTicketTypeRole(primary)) {
    return "tickets";
  }
  if (isInstitutionRosterStaffRole(primary)) return "institution";
  if (primary === "application_reviewer") return "applications";
  return "content";
}

function buildChartData(): {
  chartData: SliceRow[];
  totalMembers: number;
  totalStaffActivity: number;
  superActivity: number;
} {
  const users = loadManagedUsers().filter((u) => u.isActive !== false);
  const membersByCat: Record<CatKey, number> = {
    leadership: 0,
    content: 0,
    commerce: 0,
    tickets: 0,
    institution: 0,
    applications: 0,
  };
  const activityByCat: Record<CatKey, number> = {
    leadership: 0,
    content: 0,
    commerce: 0,
    tickets: 0,
    institution: 0,
    applications: 0,
  };

  for (const u of users) {
    const primary = primaryStaffRole(u.roles as StaffRole[]);
    if (!primary) continue;
    membersByCat[categoryKeyFromPrimary(primary)] += 1;
  }

  const managedMap = new Map(users.map((x) => [x.username.trim().toLowerCase(), x]));
  const superLc = SUPER_ADMIN_USERNAME.trim().toLowerCase();

  for (const log of loadActivityLog()) {
    const actor = log.actor.trim().toLowerCase();
    if (!actor) continue;
    if (actor === superLc) {
      activityByCat.leadership += 1;
      continue;
    }
    const mu = managedMap.get(actor);
    if (!mu) continue;
    const primary = primaryStaffRole(mu.roles as StaffRole[]);
    if (!primary) continue;
    activityByCat[categoryKeyFromPrimary(primary)] += 1;
  }

  const chartData: SliceRow[] = CATEGORY_ORDER.map((c) => {
    const members = membersByCat[c.key];
    const activity = activityByCat[c.key];
    const value = members + activity;
    return {
      key: c.key,
      name: c.label,
      fill: c.fill,
      members,
      activity,
      value,
    };
  }).filter((row) => row.value > 0);

  const totalMembers = users.length;
  const totalStaffActivity = Object.values(activityByCat).reduce((s, n) => s + n, 0);
  const superActivity = activityByCat.leadership;

  return { chartData, totalMembers, totalStaffActivity, superActivity };
}

function useStaffEngagementSnapshot() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener("storage", bump);
    window.addEventListener(IC_MANAGED_STAFF_CHANGED_EVENT, bump);
    window.addEventListener(IC_ACTIVITY_LOG_CHANGED_EVENT, bump);
    window.addEventListener(DASHBOARD_LIVE_EVENT, bump);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener(IC_MANAGED_STAFF_CHANGED_EVENT, bump);
      window.removeEventListener(IC_ACTIVITY_LOG_CHANGED_EVENT, bump);
      window.removeEventListener(DASHBOARD_LIVE_EVENT, bump);
    };
  }, []);
  return useMemo(() => buildChartData(), [tick]);
}

function TooltipBody({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: SliceRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-xs shadow-lg",
        "border-slate-200 bg-white text-slate-900",
        "dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50",
      )}
    >
      <p className="font-display font-semibold">{row.name}</p>
      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
        أعضاء في هذا المجال: <span className="font-mono font-semibold text-rose-700 dark:text-rose-300">{row.members}</span>
      </p>
      <p className="text-[11px] text-slate-600 dark:text-slate-400">
        نشاط مسجّل في السجل: <span className="font-mono font-semibold text-rose-700 dark:text-rose-300">{row.activity}</span>
      </p>
    </div>
  );
}

/** مخطط دائرة — الطاقم ذو الصلاحيات وتوزيعهم مع وزن النشاط من سجل اللوحة */
export function DashboardTeamDonut({ className }: { className?: string }) {
  const { chartData, totalMembers, totalStaffActivity, superActivity } = useStaffEngagementSnapshot();

  const scoreTotal = useMemo(() => chartData.reduce((s, d) => s + d.value, 0), [chartData]);
  const showChart = chartData.length > 0 && scoreTotal > 0;

  return (
    <div className={cn("text-right", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">الطاقم والتفاعل</h2>
          </div>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            توزيع الأعضاء الذين لديهم صلاحيات في لوحة التحكم حسب <span className="font-medium text-slate-800 dark:text-slate-200">مجال العمل</span>
            ، مع توسيع القطعة بحسب عدد الأحداث المسجّلة لهم في{" "}
            <span className="font-medium text-slate-800 dark:text-slate-200">سجل النشاط</span> (بما في ذلك نشاط سوبر الأدمن في خانة الإدارة العليا).
          </p>
        </div>
        <div className="rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50 to-white px-4 py-3 text-left shadow-sm dark:border-rose-700/50 dark:from-rose-950/50 dark:to-slate-900/80">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">ملخص سريع</p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums text-rose-700 dark:text-rose-300">{totalMembers} عضواً</p>
          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
            {totalStaffActivity} حدثاً في السجل
            {superActivity > 0 ? (
              <span className="mr-1 text-amber-700/90 dark:text-amber-400"> · منها {superActivity} كسوبر أدمن</span>
            ) : null}
          </p>
        </div>
      </div>

      {showChart ? (
        <div className="relative mx-auto w-full max-w-lg">
          <div className="h-[min(340px,58vw)] w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius="56%"
                  outerRadius="86%"
                  paddingAngle={2.5}
                  strokeWidth={2}
                  className="stroke-white dark:stroke-slate-900"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<TooltipBody />} cursor={{ fill: "hsl(var(--primary) / 0.06)" }} />
                <Legend
                  verticalAlign="bottom"
                  align="right"
                  layout="horizontal"
                  wrapperStyle={{ direction: "rtl", paddingTop: 14 }}
                  formatter={(value, entry) => {
                    const row = entry?.payload as SliceRow | undefined;
                    const v = row?.value ?? 0;
                    const pct = scoreTotal > 0 ? Math.round((v / scoreTotal) * 100) : 0;
                    const m = row?.members ?? 0;
                    const a = row?.activity ?? 0;
                    return (
                      <span className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                        {value}{" "}
                        <span className="font-mono text-rose-600 dark:text-rose-400">({pct}%)</span>
                        <span className="mr-1 block text-[10px] text-slate-500 dark:text-slate-500">
                          {m} عضو — {a} نشاط
                        </span>
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pointer-events-none absolute left-1/2 top-[40%] w-[52%] max-w-[11rem] -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="font-display text-[10px] tracking-wide text-slate-500 dark:text-slate-400">وزن القطع</p>
            <p className="font-display text-[11px] font-semibold leading-tight text-slate-700 dark:text-slate-200">
              أعضاء + نشاط
            </p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums leading-tight text-slate-900 dark:text-slate-50 sm:text-2xl">
              {scoreTotal}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center dark:border-slate-600 dark:bg-slate-800/40">
          <UsersRound className="mb-3 h-11 w-11 text-slate-300 dark:text-slate-600" aria-hidden />
          <p className="font-display text-sm font-semibold text-slate-700 dark:text-slate-300">لا بيانات بعد للطاقم أو النشاط</p>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            أضف مستخدمين من «المستخدمون والأدوار» أو نفّذ عمليات في اللوحة ليُسجَّل النشاط.
          </p>
        </div>
      )}
    </div>
  );
}
