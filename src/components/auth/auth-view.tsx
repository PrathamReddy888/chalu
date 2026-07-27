"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useLocaleStore } from "@/stores/locale";
import { useViewStore, type Persona } from "@/stores/view";
import { useAuthStore, type Role } from "@/stores/auth";
import { TicketCard, PressButton, StatusPill } from "@/components/kot";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus, ShieldCheck, KeyRound, ArrowLeft, ChefHat, Crown, UtensilsCrossed, ConciergeBell, AlertCircle } from "lucide-react";

type Mode = "login" | "signup" | "otp";

// Map a NextAuth error code to a plain-language message.
// Codes: https://next-auth.js.org/configuration/pages#error-page
function oauthErrorMessage(code: string, locale: "en" | "hi"): string {
  const map: Record<string, { en: string; hi: string }> = {
    Configuration: { en: "Google OAuth isn't configured on this deployment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env, then restart.", hi: "इस डिप्लॉय पर Google OAuth कॉन्फ़िग नहीं है। .env में GOOGLE_CLIENT_ID और GOOGLE_CLIENT_SECRET सेट करें, फिर रीस्टार्ट करें।" },
    AccessDenied: { en: "You cancelled the Google sign-in. No account was created.", hi: "आपने Google साइन-इन रद्द किया। कोई अकाउंट नहीं बना।" },
    OAuthSignin: { en: "Google sign-in couldn't start — the redirect may be blocked or credentials are wrong.", hi: "Google साइन-इन शुरू नहीं हुआ — रीडायरेक्ट ब्लॉक या क्रेडेंशियल गलत।" },
    OAuthCallback: { en: "Google didn't return a valid identity. Please try again.", hi: "Google ने मान्य पहचान नहीं दी। फिर कोशिश करें।" },
    OAuthCreateAccount: { en: "We couldn't create your account from Google. Please sign up with email instead.", hi: "Google से अकाउंट नहीं बना। ईमेल से साइन-अप करें।" },
    OAuthAccountNotLinked: { en: "This email is already registered with a password. Log in with email/password to link your Google account.", hi: "यह ईमेल पहले से पासवर्ड से रजिस्टर्ड है। ईमेल/पासवर्ड से लॉगिन करके Google अकाउंट लिंक करें।" },
    Callback: { en: "The Google sign-in callback failed — the redirect URI may not match. Check Google Cloud Console.", hi: "Google साइन-इन कॉलबैक विफल — रीडायरेक्ट URI मेल नहीं खा रहा। Google Cloud Console जांचें।" },
    Verification: { en: "Google sign-in verification failed — the session may have expired. Try again.", hi: "Google साइन-इन जांच विफल — सेशन खत्म हो गया। फिर कोशिश करें।" },
    Default: { en: `Google sign-in failed (${code}). Please try again or use email/password.`, hi: `Google साइन-इन विफल (${code})। फिर कोशिश करें या ईमेल/पासवर्ड इस्तेमाल करें।` },
  };
  return (map[code] ?? { en: `Google sign-in failed (${code}).`, hi: `Google साइन-इन विफल (${code})।` })[locale];
}

export function AuthView() {
  const { locale } = useLocaleStore();
  const { setView, pendingPersona, setPersona, setPendingPersona } = useViewStore();
  const { setAuth } = useAuthStore();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [roleCode, setRoleCode] = useState("");
  const [otp, setOtp] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Surface OAuth callback errors honestly + clean the URL so it doesn't persist on refresh
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      setOauthError(oauthErrorMessage(err, locale));
      // Clean the URL so the error doesn't re-trigger on refresh/navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, locale]);

  // Pre-fill role if the user came in via a role-gated CTA
  useEffect(() => {
    if (pendingPersona === "kitchen") setRole("kitchen");
    else if (pendingPersona === "waiter") setRole("staff");
    else if (pendingPersona === "owner") setRole("owner");
  }, [pendingPersona]);

  const personaLabel: Record<Persona, { en: string; hi: string; icon: typeof ChefHat }> = {
    customer: { en: "the Customer app", hi: "ग्राहक ऐप", icon: UtensilsCrossed },
    kitchen: { en: "the Kitchen app", hi: "रसोई ऐप", icon: ChefHat },
    waiter: { en: "the Waiter app", hi: "वेटर ऐप", icon: ConciergeBell },
    owner: { en: "the Owner app", hi: "मालिक ऐप", icon: Crown },
  };
  const pending = pendingPersona ? personaLabel[pendingPersona] : null;

  const routeAfterAuth = (userRole: Role) => {
    // Honor pendingPersona if it matches the user's role; otherwise route by actual role.
    let target: Persona;
    if (pendingPersona && (pendingPersona === userRole || (pendingPersona === "waiter" && userRole === "staff"))) {
      target = pendingPersona;
    } else if (userRole === "kitchen") target = "kitchen";
    else if (userRole === "staff") target = "waiter";
    else if (userRole === "owner") target = "owner";
    else target = "customer";
    setPersona(target);
    setPendingPersona(null);
    setView(target === "kitchen" ? "kitchen" : target === "waiter" ? "waiter" : target === "owner" ? "dashboard" : "menu");
  };

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api<{ user: any; token: string }>("/api/auth/login", { method: "POST", body: { email, password } });
        setAuth(res.user, res.token);
        toast.success(t("toast_login_ok", locale), { description: res.user.name });
        routeAfterAuth(res.user.role as Role);
      } else if (mode === "signup") {
        const res = await api<{ user: any; token: string }>("/api/auth/signup", { method: "POST", body: { name, email, password, role, roleCode } });
        setAuth(res.user, res.token);
        toast.success(t("toast_login_ok", locale));
        routeAfterAuth(res.user.role as Role);
      } else if (mode === "otp") {
        await api("/api/auth/otp/verify", { method: "POST", body: { email, code: otp } });
        toast.success(locale === "en" ? "OTP verified — please log in" : "OTP जांचा — कृपया लॉगिन करें");
        setMode("login");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setLoading(true);
    try {
      const res = await api<{ code: string }>("/api/auth/otp/send", { method: "POST", body: { email } });
      setSentOtp(res.code);
      toast.success(locale === "en" ? "OTP sent (shown on screen for demo)" : "OTP भेजा (डेमो के लिए स्क्रीन पर दिख रहा)");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async () => {
    setGoogleLoading(true);
    setOauthError(null);
    // First check whether Google OAuth is actually configured on this deployment.
    // If it isn't, surface an honest, specific error inline instead of dumping the
    // user onto NextAuth's bare error page.
    try {
      const cfg = await api<{ googleConfigured: boolean }>("/api/auth/config");
      if (!cfg.googleConfigured) {
        setOauthError(oauthErrorMessage("Configuration", locale));
        setGoogleLoading(false);
        return;
      }
    } catch {
      // if the check itself fails, let NextAuth try — it will error honestly
    }
    // Real NextAuth Google sign-in. callbackUrl returns here; AppShell's useSession
    // effect bridges the session into the app JWT and routes by role.
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <button onClick={() => { setPendingPersona(null); setView("landing"); }} className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-clay hover:text-ink">
        <ArrowLeft className="h-3 w-3" /> {locale === "en" ? "back home" : "होम पर जाएं"}
      </button>

      <TicketCard className="overflow-hidden">
        {/* Contextual header — makes it obvious which app you're signing into */}
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 bg-paper-deep/60 px-4 py-2.5 rounded-t-[12px]">
          <div className="flex items-center gap-2">
            {pending && <pending.icon className="h-4 w-4" style={{ color: "var(--color-chili)" }} />}
            <h3 className="font-display font-bold text-sm">
              {pending
                ? (locale === "en" ? `Sign in to ${pending.en}` : `${pending.hi} में साइन-इन करें`)
                : (mode === "login" ? t("act_login", locale) : mode === "signup" ? t("act_signup", locale) : t("act_verify_otp", locale))}
            </h3>
          </div>
          <StatusPill tone={mode === "login" ? "new" : mode === "signup" ? "cooking" : "low"} size="xs">{mode}</StatusPill>
        </div>

        {/* Honest OAuth error state */}
        {oauthError && (
          <div className="m-3 flex items-start gap-2 rounded-[10px] border border-chili/25 bg-chili/8 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--color-chili)" }} />
            <div className="text-sm">
              <p className="font-semibold" style={{ color: "var(--color-chili)" }}>{locale === "en" ? "Google sign-in didn't complete" : "Google साइन-इन पूरा नहीं हुआ"}</p>
              <p className="mt-0.5 text-ink/75">{oauthError}</p>
            </div>
            <button onClick={() => setOauthError(null)} className="ml-auto font-mono text-[10px] uppercase tracking-wider text-clay hover:text-ink">dismiss</button>
          </div>
        )}

        {/* Mode tabs */}
        <div className="flex border-b border-ink/10">
          {(["login", "signup", "otp"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 font-display text-xs font-semibold uppercase tracking-wide transition ${
                mode === m ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-paper-deep"
              }`}
            >
              {m === "login" ? t("act_login", locale) : m === "signup" ? t("act_signup", locale) : "OTP"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 p-4">
          {mode === "signup" && (
            <Field label={locale === "en" ? "Name" : "नाम"}>
              <input value={name} onChange={(e) => setName(e.target.value)} className="kot-input" placeholder="Priya Sharma" />
            </Field>
          )}
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="kot-input" placeholder="you@chalu.in" />
          </Field>
          {mode !== "otp" && (
            <Field label={locale === "en" ? "Password" : "पासवर्ड"}>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="kot-input" placeholder="••••••••" />
            </Field>
          )}
          {mode === "signup" && (
            <>
              <Field label={locale === "en" ? "Role" : "भूमिका"}>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="kot-input">
                  <option value="customer">{locale === "en" ? "Customer" : "ग्राहक"}</option>
                  <option value="staff">Staff / Waiter</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="owner">Owner / Admin</option>
                </select>
              </Field>
              {role !== "customer" && (
                <Field label={locale === "en" ? "Role code (demo)" : "रोल कोड (डेमो)"}>
                  <input value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="kot-input" placeholder={`chalu-${role}`} />
                  <p className="mt-1 font-mono text-[10px] text-clay">
                    {locale === "en" ? "Demo codes: chalu-staff · chalu-kitchen · chalu-owner" : "डेमो कोड: chalu-staff · chalu-kitchen · chalu-owner"}
                  </p>
                </Field>
              )}
            </>
          )}
          {mode === "otp" && (
            <>
              <PressButton variant="chalk" size="sm" onClick={sendOtp} disabled={loading || !email}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                {locale === "en" ? "Send OTP" : "OTP भेजें"}
              </PressButton>
              {sentOtp && (
                <div className="rounded-[8px] border border-marigold/40 bg-marigold/15 p-2 font-mono text-sm">
                  {locale === "en" ? "Demo OTP (would be SMS'd in prod):" : "डेमो OTP (प्रोड में SMS आता):"} <b>{sentOtp}</b>
                </div>
              )}
              <Field label="OTP (6 digits)">
                <input value={otp} onChange={(e) => setOtp(e.target.value)} className="kot-input" placeholder="123456" maxLength={6} inputMode="numeric" />
              </Field>
            </>
          )}

          <PressButton variant="chili" size="lg" className="mt-1 w-full" onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : mode === "signup" ? <UserPlus className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {mode === "login" ? t("act_login", locale) : mode === "signup" ? t("act_signup", locale) : t("act_verify_otp", locale)}
          </PressButton>

          {/* Google OAuth — real, end to end */}
          <div className="my-1 flex items-center gap-2">
            <span className="h-px flex-1 bg-ink/15" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-clay">or</span>
            <span className="h-px flex-1 bg-ink/15" />
          </div>
          <PressButton variant="chalk" size="md" className="w-full" onClick={googleSignIn} disabled={googleLoading}>
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.5 12.3c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-7.9z"/>
                <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23z"/>
                <path fill="#FBBC05" d="M6 14.4a6.6 6.6 0 0 1 0-4.2V7.4H2.3a11 11 0 0 0 0 9.8L6 14.4z"/>
                <path fill="#EA4335" d="M12 5.5c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.4L6 10.2c.9-2.6 3.2-4.4 6-4.7z"/>
              </svg>
            )}
            {locale === "en" ? "Continue with Google" : "Google से जारी रखें"}
          </PressButton>

          <button
            onClick={() => { setAuth({ id: "guest", name: "Guest", email: "guest@chalu.in", role: "customer", tableId: null }, "guest-token"); setPersona("customer"); setView("menu"); }}
            className="w-full text-center font-mono text-[10px] uppercase tracking-wider text-clay hover:text-ink"
          >
            {t("act_continue_guest", locale)}
          </button>
        </div>

        {/* Demo creds */}
        <div className="border-t border-ink/10 bg-paper-deep/40 p-3">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-clay">
            {locale === "en" ? "demo accounts (password: chalu123)" : "डेमो अकाउंट (पासवर्ड: chalu123)"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[["owner@chalu.in", "owner"], ["kitchen@chalu.in", "kitchen"], ["waiter@chalu.in", "staff"], ["guest@chalu.in", "customer"]].map(([em, r]) => (
              <button
                key={em}
                onClick={() => { setEmail(em); setPassword("chalu123"); setMode("login"); }}
                className="press rounded-[8px] border border-ink/15 bg-paper px-2 py-1 font-mono text-[10px] hover:bg-marigold/15"
              >
                {em} <span className="text-clay">·{r}</span>
              </button>
            ))}
          </div>
        </div>
      </TicketCard>

      <style>{`.kot-input{width:100%;height:42px;border:1px solid var(--color-ink);border-radius:8px;background:var(--color-paper);padding:0 12px;font-family:var(--font-body);font-size:14px;outline:none;transition:box-shadow 120ms ease}.kot-input:focus{box-shadow:0 0 0 3px rgba(240,166,58,0.25);border-color:var(--color-ink)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-clay">{label}</span>
      {children}
    </label>
  );
}
