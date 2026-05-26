import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { usePublicUser } from "@/contexts/PublicUserContext";
import {
  DISCORD_OAUTH_SESSION_KEY,
  exchangeDiscordCode,
  fetchDiscordMe,
  discordCdnAvatarUrl,
  getDiscordRedirectUri,
} from "@/lib/discordOAuth";
import { Button } from "@/components/ui/button";

/**
 * صفحة إرجاع OAuth من Discord.
 * مع React Strict Mode قد يُستدعى التأثير مرتين؛ نستخدم قفلًا بسيطًا على كود التفويض لمرة واحدة.
 */
const DiscordCallbackPage = () => {
  const navigate = useNavigate();
  const { signInWithDiscord } = usePublicUser();
  const signInRef = useRef(signInWithDiscord);
  signInRef.current = signInWithDiscord;
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("جاري إتمام الدخول عبر Discord…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");
    const oauthDesc = params.get("error_description");

    if (oauthError) {
      setStatus("error");
      setMessage(oauthDesc?.replace(/\+/g, " ") || "تم إلغاء الدخول أو رفض الصلاحيات.");
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setMessage("رابط العودة غير صالح.");
      return;
    }

    const lockKey = `ic_discord_code_lock_${code}`;
    if (sessionStorage.getItem(lockKey)) {
      return;
    }
    sessionStorage.setItem(lockKey, "1");

    let cancelled = false;

    (async () => {
      const raw = sessionStorage.getItem(DISCORD_OAUTH_SESSION_KEY);
      sessionStorage.removeItem(DISCORD_OAUTH_SESSION_KEY);

      if (!raw) {
        if (!cancelled) {
          setStatus("error");
          setMessage("انتهت جلسة التحقق. افتح نافذة تسجيل الدخول وحاول مرة أخرى.");
        }
        return;
      }

      let parsed: { verifier: string; state: string };
      try {
        parsed = JSON.parse(raw) as { verifier: string; state: string };
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("بيانات الجلسة تالفة.");
        }
        return;
      }

      if (parsed.state !== state) {
        if (!cancelled) {
          setStatus("error");
          setMessage("فشل التحقق الأمني (state). حاول تسجيل الدخول مجدداً.");
        }
        return;
      }

      const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID?.trim();
      if (!clientId) {
        if (!cancelled) {
          setStatus("error");
          setMessage("معرّف تطبيق Discord غير مُعرّف (VITE_DISCORD_CLIENT_ID).");
        }
        return;
      }

      try {
        const redirectUri = getDiscordRedirectUri();
        const token = await exchangeDiscordCode({
          clientId,
          code,
          redirectUri,
          codeVerifier: parsed.verifier,
        });
        const me = await fetchDiscordMe(token.access_token);
        if (cancelled) return;

        const avatarUrl = discordCdnAvatarUrl(me.id, me.avatar);
        const result = signInRef.current({
          discordUserId: me.id,
          discordUsername: me.username,
          globalName: me.global_name,
          email: me.email ?? null,
          avatarUrl,
        });

        if (!result.ok) {
          setStatus("error");
          setMessage(result.reason);
          return;
        }

        window.history.replaceState({}, "", "/auth/discord/callback");
        navigate("/profile", { replace: true });
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setStatus("error");
          setMessage("تعذر إكمال الدخول من Discord. تحقق من إعدادات التطبيق والـ Redirect URI.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // جلسة OAuth لمرة واحدة عند فتح الرابط من Discord
    // eslint-disable-next-line react-hooks/exhaustive-deps -- نقرأ query مرة واحدة ونستدعي signIn مرة واحدة
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-[#f6f0fb] via-[#f8f4fc] to-[#fbf9fe] text-slate-900">
      <Navbar />
      <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 pb-24 pt-28 text-center">
        {status === "loading" ? (
          <p className="text-sm text-slate-600">{message}</p>
        ) : (
          <div className="space-y-4 rounded-2xl border border-rose-200 bg-white p-6 shadow-lg">
            <p className="text-sm text-rose-700">{message}</p>
            <Button type="button" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => navigate("/", { replace: true })}>
              العودة للرئيسية
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default DiscordCallbackPage;
