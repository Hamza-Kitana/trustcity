import { useCallback, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ImagePlus, Radio, Video, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DiscordIcon } from "@/components/DiscordIcon";
import { usePublicUser } from "@/contexts/PublicUserContext";
import { useApplicationsContent } from "@/contexts/ApplicationsContentContext";
import {
  getLatestStreamerApplicationForProfile,
  getStreamerApplicationUiStatus,
  isStreamerApplyFormBlocked,
  isValidStreamUrl,
  normalizeStreamUrl,
  STREAMER_APPLICATION_ROLE,
} from "@/lib/streamerApplication";
import {
  hasPendingCitizenApplication,
  isPostCitizenApplyUnlocked,
  MSG_POST_CITIZEN_APPROVED_NEEDED,
} from "@/lib/publicProfileEligibility";
import { useSiteVisibility } from "@/lib/siteVisibility";
import { PostCitizenApplyGate } from "@/components/PostCitizenApplyGate";
import { toast } from "sonner";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const fieldInputClass =
  "border-rose-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-rose-400";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

const StreamerApplyPage = () => {
  const reduceMotion = useReducedMotion();
  const { user, getProfile } = usePublicUser();
  const { submitApplication, applications } = useApplicationsContent();
  const visibility = useSiteVisibility();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const profile = useMemo(() => (user ? getProfile() : null), [user, getProfile]);
  const isDiscordUser = user?.authProvider === "discord";

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [acceptedLaws, setAcceptedLaws] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const streamerUiStatus = getStreamerApplicationUiStatus(profile, applications);
  const latestStreamerApplication = getLatestStreamerApplicationForProfile(profile, applications);
  const applyBlocked = isStreamerApplyFormBlocked(profile, applications);
  const applyPending = streamerUiStatus === "pending";
  const applyApproved = streamerUiStatus === "approved";
  const applyRejected = streamerUiStatus === "rejected";

  const onPickLogo = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("\u0627\u062e\u062a\u0631 \u0645\u0644\u0641 \u0635\u0648\u0631\u0629 \u0641\u0642\u0637 \u0644\u0644\u0648\u062c\u0648");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("\u062d\u062c\u0645 \u0627\u0644\u0635\u0648\u0631\u0629 \u0643\u0628\u064a\u0631 \u2014 \u0627\u0644\u062d\u062f \u0627\u0644\u0623\u0642\u0635\u0649 2 \u0645\u064a\u062c\u0627\u0628\u0627\u064a\u062a");
      return;
    }
    try {
      setLogoDataUrl(await readFileAsDataUrl(file));
      toast.success("\u062a\u0645 \u0627\u0639\u062a\u0645\u0627\u062f \u0627\u0644\u0644\u0648\u062c\u0648");
    } catch {
      toast.error("\u062a\u0639\u0630\u0631 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0635\u0648\u0631\u0629");
    }
  }, []);

  if (!user) return <Navigate to="/" replace />;
  if (!visibility.pages.streamers) return <Navigate to="/" replace />;

  const postCitizenUnlocked = isPostCitizenApplyUnlocked(profile, applications);

  const submit = () => {
    if (!postCitizenUnlocked) {
      toast.message(MSG_POST_CITIZEN_APPROVED_NEEDED);
      return;
    }
    if (!isDiscordUser) {
      toast.error("\u0627\u0644\u062a\u0642\u062f\u064a\u0645 \u0645\u062a\u0627\u062d \u0641\u0642\u0637 \u0644\u062d\u0633\u0627\u0628\u0627\u062a Discord");
      return;
    }
    if (applyBlocked) {
      toast.error(
        applyApproved
          ? "\u0637\u0644\u0628\u0643 \u0645\u0642\u0628\u0648\u0644 \u0645\u0633\u0628\u0642\u0627\u064b \u2014 \u0623\u0646\u062a \u0636\u0645\u0646 \u0635\u0646\u0651\u0627\u0639 \u0627\u0644\u0645\u062d\u062a\u0648\u0649"
          : "\u0644\u062f\u064a\u0643 \u0637\u0644\u0628 \u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629 \u2014 \u0627\u0646\u062a\u0638\u0631 \u0642\u0631\u0627\u0631 \u0627\u0644\u0633\u062a\u0631\u064a\u0645\u0631 \u0645\u0646\u062c\u0631",
      );
      return;
    }
    const nameTrim = displayName.trim();
    if (nameTrim.length < 3) {
      toast.error("\u0627\u0643\u062a\u0628 \u0627\u0633\u0645 \u0627\u0644\u0639\u0631\u0636 (3 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644)");
      return;
    }
    if (!isValidStreamUrl(streamUrl)) {
      toast.error("\u0623\u062f\u062e\u0644 \u0631\u0627\u0628\u0637 \u0628\u062b \u0635\u062d\u064a\u062d (Kick \u0623\u0648 TikTok \u0623\u0648 Twitch\u2026)");
      return;
    }
    if (!logoDataUrl) {
      toast.error("\u0627\u0631\u0641\u0639 \u0644\u0648\u062c\u0648 \u0623\u0648 \u0635\u0648\u0631\u0629 \u0644\u0644\u0628\u0637\u0627\u0642\u0629");
      return;
    }
    if (!acceptedLaws) {
      toast.error("\u064a\u062c\u0628 \u0627\u0644\u0625\u0642\u0631\u0627\u0631 \u0628\u0642\u0631\u0627\u0621\u0629 \u0642\u0648\u0627\u0646\u064a\u0646 \u0627\u0644\u0645\u062f\u064a\u0646\u0629");
      return;
    }

    const parts = nameTrim.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? nameTrim;
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "\u2014";
    const discordHandle = profile?.username ?? user.username;
    const discordId = profile?.discordId ?? "";
    const discordSnapshot = discordId ? `${discordHandle} (ID: ${discordId})` : discordHandle;

    setSubmitting(true);
    const result = submitApplication({
      roleKey: STREAMER_APPLICATION_ROLE,
      targetTitle: "\u062a\u0642\u062f\u064a\u0645 \u0635\u0646\u0627\u0639 \u0627\u0644\u0645\u062d\u062a\u0648\u0649",
      applicantUserId: user.id,
      applicantUsername: user.username,
      applicantDisplayName: user.displayName,
      snapshot: {
        firstName,
        lastName,
        gender: "male",
        birthSummaryLine: "\u2014",
        ageSummaryLine: "\u2014",
        countryCode: "JO",
        discord: discordSnapshot,
        previousCities: "\u2014",
        experience: bio.trim() || "\u2014",
        lawsAccepted: true,
        bio: bio.trim(),
        avatarDataUrl: logoDataUrl,
        discordId: discordId || undefined,
        streamUrl: normalizeStreamUrl(streamUrl),
        cityName: profile?.cityName?.trim() || nameTrim,
      },
    });
    setSubmitting(false);

    if (result === "ok") {
      setSubmitted(true);
      toast.success("\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628\u0643 \u2014 \u0633\u064a\u0631\u0627\u062c\u0639\u0647 \u0627\u0644\u0633\u062a\u0631\u064a\u0645\u0631 \u0645\u0646\u062c\u0631");
    } else if (result === "storage_quota") {
      toast.error("\u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u0645\u0645\u062a\u0644\u0626\u0629 \u2014 \u062a\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u0625\u062f\u0627\u0631\u0629");
    } else {
      toast.error("\u062a\u0639\u0630\u0631 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628 \u2014 \u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629");
    }
  };

  return (
    <div dir="rtl">
      <Navbar />
      <motion.div className="light min-h-screen bg-[#f4f0fb] text-slate-900 antialiased">
        <motion.div className="relative overflow-hidden pt-[env(safe-area-inset-top,0px)]">
          <motion.div className="pointer-events-none absolute -left-40 top-0 h-72 w-72 rounded-full bg-rose-400/25 blur-[100px]" />
          <motion.div className="pointer-events-none absolute -right-24 top-20 h-64 w-64 rounded-full bg-red-400/20 blur-[90px]" />
          <motion.div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-rose-200/40 via-transparent to-transparent" />

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative mx-auto flex max-w-2xl flex-col items-center px-4 pb-8 pt-24 text-center sm:px-6 md:px-8"
          >
            <motion.div className="relative mb-4">
              <motion.div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-red-400 via-rose-500 to-indigo-600 opacity-80 blur-md" />
              <motion.div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-red-600 via-rose-600 to-indigo-700 text-white shadow-[0_20px_50px_-12px_rgba(192,38,211,0.45)] ring-2 ring-red-200/60 md:h-28 md:w-28">
                <Video className="h-11 w-11 md:h-12 md:w-12" />
              </motion.div>
            </motion.div>
            <p className="font-display text-[11px] tracking-[0.35em] text-rose-700/90">CONTENT CREATOR</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900 md:text-3xl">
              {"\u0627\u0644\u062a\u0642\u062f\u064a\u0645 \u0643\u0635\u0627\u0646\u0639 \u0645\u062d\u062a\u0648\u0649"}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
              {"\u0627\u0645\u0644\u0623 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0648\u0644\u0648\u062c\u0648\u0643 \u0648\u0631\u0627\u0628\u0637 \u0627\u0644\u0628\u062b. \u0639\u0646\u062f \u0627\u0644\u0642\u0628\u0648\u0644 \u062a\u064f\u0636\u0627\u0641 \u0628\u0637\u0627\u0642\u062a\u0643 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0625\u0644\u0649 \u0635\u0641\u062d\u0629 "}
              <Link to="/streamers" className="font-semibold text-rose-700 underline underline-offset-2">
                {"\u0635\u0646\u0651\u0627\u0639 \u0627\u0644\u0645\u062d\u062a\u0648\u0649"}
              </Link>
              .
            </p>
          </motion.div>
        </motion.div>

        <main className="relative z-10 mx-auto w-full max-w-2xl space-y-6 px-4 pb-20 sm:px-6 md:px-8">
          {!postCitizenUnlocked ? (
            <PostCitizenApplyGate profile={profile} applications={applications} />
          ) : submitted || applyPending ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-3xl border border-amber-300/90 bg-gradient-to-l from-amber-50 via-white to-orange-50/80 px-5 py-6 text-right shadow-[0_18px_44px_-22px_rgba(217,119,6,0.35)] sm:px-6"
            >
              <motion.div className="flex items-start justify-end gap-3">
                <motion.div className="min-w-0 flex-1">
                  <p className="font-display text-[10px] tracking-[0.32em] text-amber-800/90">
                    {"\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629"}
                  </p>
                  <p className="mt-1 flex items-center justify-end gap-2 font-display text-xl font-bold text-amber-950">
                    <Radio className="h-5 w-5 shrink-0" />
                    {applyPending ? "\u0637\u0644\u0628\u0643 \u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629" : "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628\u0643"}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-amber-900/85">
                    {
                      "\u0633\u064a\u0631\u0627\u062c\u0639 \u0627\u0644\u0633\u062a\u0631\u064a\u0645\u0631 \u0645\u0646\u062c\u0631 \u0637\u0644\u0628\u0643. \u064a\u064f\u0639\u0631\u0636 \u0627\u0644\u062d\u0627\u0644\u0629 \u0641\u064a \u0628\u0631\u0648\u0641\u0627\u064a\u0644\u0643 \u0648\u064a\u064f\u0631\u0633\u0644 \u0625\u0634\u0639\u0627\u0631 \u0639\u0646\u062f \u0627\u0644\u0642\u0628\u0648\u0644 \u0623\u0648 \u0627\u0644\u0631\u0641\u0636."
                    }
                  </p>
                  <motion.div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button
                      asChild
                      variant="outline"
                      className="border-amber-300/90 bg-white text-amber-950 hover:bg-amber-50"
                    >
                      <Link to="/profile">{"\u0627\u0644\u0628\u0631\u0648\u0641\u0627\u064a\u0644"}</Link>
                    </Button>
                    <Button asChild className="bg-rose-600 text-white hover:bg-rose-700">
                      <Link to="/streamers">{"\u0635\u0641\u062d\u0629 \u0635\u0646\u0651\u0627\u0639 \u0627\u0644\u0645\u062d\u062a\u0648\u0649"}</Link>
                    </Button>
                  </motion.div>
                </motion.div>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/80">
                  <Radio className="h-7 w-7" />
                </span>
              </motion.div>
            </motion.div>
          ) : applyApproved ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-3xl border border-emerald-200/90 bg-gradient-to-l from-emerald-50 via-white to-teal-50 px-5 py-6 text-right shadow-[0_18px_44px_-22px_rgba(16,185,129,0.35)] sm:px-6"
            >
              <motion.div className="flex items-start justify-end gap-3">
                <motion.div className="min-w-0 flex-1">
                  <p className="font-display text-[10px] tracking-[0.32em] text-emerald-700/90">
                    {"\u0645\u0642\u0628\u0648\u0644"}
                  </p>
                  <p className="mt-1 flex items-center justify-end gap-2 font-display text-xl font-bold text-emerald-950">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    {"\u0623\u0646\u062a \u0636\u0645\u0646 \u0635\u0646\u0651\u0627\u0639 \u0627\u0644\u0645\u062d\u062a\u0648\u0649"}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-emerald-900/85">
                    {
                      "\u0628\u0637\u0627\u0642\u062a\u0643 \u0645\u0648\u062c\u0648\u062f\u0629 \u0639\u0644\u0649 \u0635\u0641\u062d\u0629 \u0635\u0646\u0651\u0627\u0639 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u2014 \u062a\u064f\u062d\u062f\u0651\u062b \u0645\u0646 \u0644\u0648\u062d\u0629 \u0627\u0644\u0633\u062a\u0631\u064a\u0645\u0631 \u0645\u0646\u062c\u0631 \u0639\u0646\u062f \u0627\u0644\u062d\u0627\u062c\u0629."
                    }
                  </p>
                  <Button asChild className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700">
                    <Link to="/streamers">{"\u0639\u0631\u0636 \u0627\u0644\u0628\u0637\u0627\u0642\u0629"}</Link>
                  </Button>
                </motion.div>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80">
                  <CheckCircle2 className="h-7 w-7" />
                </span>
              </motion.div>
            </motion.div>
          ) : (
            <>
              {applyRejected ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-3xl border border-rose-200/90 bg-gradient-to-l from-rose-50 via-white to-orange-50/70 px-5 py-5 text-right shadow-[0_18px_44px_-22px_rgba(244,63,94,0.28)] sm:px-6"
                >
                  <div className="flex items-start justify-end gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[10px] tracking-[0.32em] text-rose-700/90">
                        {"\u0637\u0644\u0628 \u0633\u0627\u0628\u0642 \u0645\u0631\u0641\u0648\u0636"}
                      </p>
                      <p className="mt-1 flex items-center justify-end gap-2 font-display text-xl font-bold text-rose-950">
                        <XCircle className="h-5 w-5 shrink-0" />
                        {"\u0644\u0645 \u064a\u064f\u0642\u0628\u0644 \u0637\u0644\u0628\u0643"}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-rose-900/85">
                        {latestStreamerApplication?.note?.trim()
                          ? latestStreamerApplication.note.trim()
                          : "\u064a\u0645\u0643\u0646\u0643 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u062c\u062f\u064a\u062f \u0623\u062f\u0646\u0627\u0647 \u0628\u0639\u062f \u0645\u0631\u0627\u062c\u0639\u0629 \u0627\u0644\u0645\u062a\u0637\u0644\u0628\u0627\u062a."}
                      </p>
                    </div>
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 ring-1 ring-rose-200/80">
                      <XCircle className="h-7 w-7" />
                    </span>
                  </div>
                </motion.div>
              ) : null}
              <Card className="overflow-hidden border-rose-200/90 bg-white/95 text-slate-900 shadow-[0_24px_60px_-28px_rgba(54,22,79,0.35)] backdrop-blur-sm">
              <CardHeader className="border-b border-rose-100/90 bg-gradient-to-l from-rose-50/90 to-white pb-6 text-right">
                <CardTitle className="flex items-center justify-end gap-2 font-display text-xl text-slate-900">
                  <Video className="h-5 w-5 text-rose-600" />
                  {applyRejected ? "\u062a\u0642\u062f\u064a\u0645 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649" : "\u0646\u0645\u0648\u0630\u062c \u0627\u0644\u062a\u0642\u062f\u064a\u0645"}
                </CardTitle>
                <CardDescription className="mt-1 text-pretty text-slate-600">
                  {"\u0627\u0633\u062a\u062e\u062f\u0645 \u00ab\u0627\u0633\u0645 \u0627\u0644\u0639\u0631\u0636 \u0639\u0644\u0649 \u0627\u0644\u0628\u0637\u0627\u0642\u0629\u00bb \u0648\u0644\u064a\u0633 "}
                  <span className="font-semibold text-slate-800">{"\u0627\u0633\u0645 \u0627\u0644\u0645\u062f\u064a\u0646\u0629"}</span>
                  {" \u0641\u064a \u0627\u0644\u0628\u0631\u0648\u0641\u0627\u064a\u0644 \u2014 \u0645\u0639 \u0635\u0648\u0631\u0629 \u0648\u0627\u0636\u062d\u0629 \u0642\u0628\u0644 \u0627\u0644\u0625\u0631\u0633\u0627\u0644."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6 text-right">
                {isDiscordUser ? (
                  <motion.div className="flex items-center justify-end gap-2 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10 px-3 py-2 text-sm">
                    <DiscordIcon className="h-4 w-4" />
                    <span dir="ltr" className="font-mono text-slate-700">
                      {user.displayName || user.username}
                    </span>
                  </motion.div>
                ) : null}

                <motion.div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-800">
                    {"\u0627\u0633\u0645 \u0627\u0644\u0639\u0631\u0636 \u0639\u0644\u0649 \u0627\u0644\u0628\u0637\u0627\u0642\u0629"}
                  </Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={"\u0645\u062b\u0627\u0644: \u0623\u062d\u0645\u062f \u0627\u0644\u0633\u062a\u0631\u064a\u0645\u0631"}
                    className={`text-right ${fieldInputClass}`}
                  />
                </motion.div>

                <motion.div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-800">
                    {"\u0627\u0644\u0646\u0628\u0630\u0629 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)"}
                  </Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={
                      "\u0627\u062e\u062a\u064a\u0627\u0631\u064a \u2014 \u0646\u0628\u0630\u0629 \u0639\u0646 \u0642\u0646\u0627\u062a\u0643 \u0648\u0645\u0627 \u062a\u0628\u062b\u0647"
                    }
                    className={`min-h-[100px] text-right ${fieldInputClass}`}
                  />
                </motion.div>

                <motion.div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-800">{"\u0631\u0627\u0628\u0637 \u0627\u0644\u0628\u062b"}</Label>
                  <Input
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="https://kick.com/username \u0623\u0648 \u0631\u0627\u0628\u0637 TikTok"
                    className={`text-left ${fieldInputClass}`}
                    dir="ltr"
                  />
                </motion.div>

                <motion.div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-800">
                    {"\u0644\u0648\u062c\u0648 / \u0635\u0648\u0631\u0629 \u0627\u0644\u0628\u0637\u0627\u0642\u0629"}
                  </Label>
                  <motion.div className="flex flex-wrap items-center justify-end gap-3">
                    {logoDataUrl ? (
                      <img
                        src={logoDataUrl}
                        alt=""
                        className="h-20 w-20 rounded-2xl border border-rose-200 object-cover shadow-sm"
                      />
                    ) : (
                      <motion.div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-rose-300 bg-rose-50 text-rose-400">
                        <ImagePlus className="h-8 w-8" />
                      </motion.div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickLogo(e.target.files?.[0])}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-rose-200 bg-white text-slate-800 hover:bg-rose-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {"\u0631\u0641\u0639 \u0635\u0648\u0631\u0629"}
                    </Button>
                  </motion.div>
                </motion.div>

                <motion.div className="flex items-start justify-end gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4">
                  <Checkbox
                    id="streamer-laws"
                    checked={acceptedLaws}
                    onCheckedChange={(v) => setAcceptedLaws(v === true)}
                  />
                  <Label htmlFor="streamer-laws" className="cursor-pointer text-sm leading-relaxed text-slate-700">
                    {"\u0623\u0642\u0631 \u0628\u0623\u0646\u0646\u064a \u0642\u0631\u0623\u062a "}
                    <Link to="/laws" className="font-semibold text-rose-700 underline underline-offset-2">
                      {"\u0642\u0648\u0627\u0646\u064a\u0646 \u0627\u0644\u0645\u062f\u064a\u0646\u0629"}
                    </Link>
                    {" \u0648\u0623\u0644\u062a\u0632\u0645 \u0628\u0647\u0627 \u0643\u0635\u0627\u0646\u0639 \u0645\u062d\u062a\u0648\u0649."}
                  </Label>
                </motion.div>

                <Button
                  type="button"
                  disabled={submitting}
                  className="h-12 w-full rounded-2xl bg-gradient-to-l from-red-600 via-rose-600 to-indigo-700 font-display text-base text-white shadow-[0_24px_60px_-28px_rgba(192,38,211,0.45)] hover:opacity-95"
                  onClick={submit}
                >
                  {submitting ? "\u062c\u0627\u0631\u064a \u0627\u0644\u0625\u0631\u0633\u0627\u0644\u2026" : "\u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u062a\u0642\u062f\u064a\u0645"}
                </Button>
              </CardContent>
            </Card>
            </>
          )}
        </main>
        <Footer forceLight />
      </motion.div>
    </div>
  );
};

export default StreamerApplyPage;
