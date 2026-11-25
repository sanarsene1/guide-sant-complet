import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Eye, EyeOff, Mail, MailCheck, Phone, UserRound } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Brand } from "@/components/auth/brand";
import { AuthShowcase } from "@/components/auth/auth-showcase";
import { ThemeMenu } from "@/components/theme-menu";
import {
  ACCOUNT_CACHE_KEY,
  ACCOUNT_HOME,
  DIAL_CODES,
  HOME_AFTER_SIGN_IN,
  accountSummary,
  toInternationalPhone,
} from "@/lib/auth-helpers";
import { cn } from "@/lib/utils";
import { LegalLinks } from "@/components/legal/legal-links";

const HERE = "/espace-veterinaire";
const OAUTH_INTENT = "vc-auth-intent";

export const Route = createFileRoute("/espace-veterinaire")({
  head: () => ({
    meta: [
      { title: "Se connecter – VetoCare" },
      {
        name: "description",
        content: "Connectez-vous ou créez votre compte VetoCare avec Google, votre email ou votre numéro de téléphone.",
      },
      { property: "og:title", content: "Se connecter – VetoCare" },
      {
        property: "og:description",
        content: "Votre compte VetoCare : connexion avec Google, email ou téléphone.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "icon", href: "/site/assets/favicon.svg" }],
  }),
  component: AccountPage,
});

type Mode = "login" | "signup";
type Method = "email" | "phone";
type View = "loading" | "auth" | "otp" | "forgot" | "check-email" | "recover" | "account";

const GoogleMark = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);

/** Keeps the static site's menu (name + photo or initial) in step with the session. */
function syncAccount(session: Session | null) {
  try {
    if (session) localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(accountSummary(session.user)));
    else localStorage.removeItem(ACCOUNT_CACHE_KEY);
  } catch {
    /* storage unavailable: the menu keeps "Mon compte" */
  }
}

/** A saved sign-in on this device (the auth client keeps it under sb-<projet>-auth-token). */
function hasStoredSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.+-auth-token$/.test(k)) return true;
    }
  } catch {
    /* storage unavailable */
  }
  return false;
}

const NEXT_KEY = "vc-next";
/** Page demandée avant la connexion (ex. une formation), seulement si c’est une page de ce site. */
function takeNext() {
  const n = sessionStorage.getItem(NEXT_KEY);
  sessionStorage.removeItem(NEXT_KEY);
  return n && n.startsWith("/") && !n.startsWith("//") ? n : null;
}

async function goHome() {
  const { data } = await supabase.auth.getSession();
  syncAccount(data.session);
  window.location.assign(takeNext() ?? HOME_AFTER_SIGN_IN);
}

function frenchError(message: string | undefined, fallback: string) {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login")) return "Adresse email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Confirmez d’abord votre adresse : ouvrez le lien reçu par email.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Un compte existe déjà avec cette adresse. Connectez-vous.";
  if (m.includes("email address is not allowed") || (m.includes("email address") && m.includes("invalid")))
    return "Cette adresse email ne peut pas recevoir de messages. Vérifiez qu’elle est bien écrite.";
  if (m.includes("phone") && (m.includes("disabled") || m.includes("unsupported") || m.includes("provider")))
    return "La connexion par téléphone n’est pas encore activée sur VetoCare. Utilisez Google ou votre email.";
  if (m.includes("expired") || (m.includes("invalid") && m.includes("otp"))) return "Ce code est incorrect ou a expiré.";
  if (m.includes("rate") || m.includes("too many") || m.includes("security purposes"))
    return "Trop de tentatives. Patientez une minute puis réessayez.";
  if (m.includes("password") && (m.includes("weak") || m.includes("short") || m.includes("least")))
    return "Choisissez un mot de passe plus sûr (8 caractères minimum).";
  return fallback;
}

function AccountPage() {
  // Start on the form so it shows at first paint (even before the scripts finish
  // loading on a slow connection); the session check only swaps it afterwards.
  const [view, setView] = useState<View>("auth");
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<Mode>("login");
  const [method, setMethod] = useState<Method>("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [dial, setDial] = useState<string>(DIAL_CODES[0].code);
  const [phoneTyped, setPhoneTyped] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const recovering = useRef(false);

  useEffect(() => {
    let active = true;
    const q = new URLSearchParams(window.location.search);
    const wantsRecovery = q.get("recover") === "1";
    const welcome = q.get("welcome") === "1";
    if (wantsRecovery) recovering.current = true;
    const next = q.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) sessionStorage.setItem(NEXT_KEY, next);
    // Only the redirect flows (Google return, confirm link, reset link) wait on the check.
    const waitsForSession = wantsRecovery || welcome || sessionStorage.getItem(OAUTH_INTENT) === "1";
    // A visitor already signed in on this device (cached by syncAccount) goes straight on: no form flash.
    const known = !!localStorage.getItem("vc-account") || hasStoredSession();
    if (waitsForSession || known) setView("loading");
    // Never leave a visitor on the skeleton if the network is slow to answer.
    const fallback = window.setTimeout(() => {
      if (active) setView((v) => (v === "loading" ? "auth" : v));
    }, 5000);

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (event !== "INITIAL_SESSION") syncAccount(next);
      if (event === "PASSWORD_RECOVERY") {
        recovering.current = true;
        setView("recover");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      window.clearTimeout(fallback);
      if (!active) return;
      const s = data.session;
      setSession(s);
      syncAccount(s);
      const oauthReturn = sessionStorage.getItem(OAUTH_INTENT) === "1";
      if (s && recovering.current) {
        setView("recover");
      } else if (s && (welcome || oauthReturn)) {
        sessionStorage.removeItem(OAUTH_INTENT);
        goHome();
      } else if (s) {
        // Déjà connecté : l’espace compte remplace l’ancien écran « vous êtes connecté ».
        window.location.replace(takeNext() ?? ACCOUNT_HOME);
      } else {
        sessionStorage.removeItem(OAUTH_INTENT);
        if (wantsRecovery) setError("Ce lien de réinitialisation n’est plus valide. Demandez-en un nouveau.");
        if (wantsRecovery) setView("forgot");
        else setView((v) => (v === "loading" ? "auth" : v));
      }
    }).catch(() => {
      window.clearTimeout(fallback);
      if (active) setView((v) => (v === "loading" ? "auth" : v));
    });

    return () => {
      active = false;
      window.clearTimeout(fallback);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const reset = () => {
    setError("");
    setInfo("");
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword("");
    reset();
  };

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    reset();
    try {
      await fn();
    } catch {
      setError(fallback);
    } finally {
      setBusy(false);
    }
  };

  const google = () =>
    run(async () => {
      sessionStorage.setItem(OAUTH_INTENT, "1");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + HERE,
      });
      if (result.error) {
        sessionStorage.removeItem(OAUTH_INTENT);
        setError("Connexion avec Google impossible. Réessayez.");
        return;
      }
      if (result.redirected) return;
      sessionStorage.removeItem(OAUTH_INTENT);
      goHome();
    }, "Connexion avec Google impossible. Réessayez.");

  const emailSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) return setError(frenchError(err.message, "Connexion impossible. Réessayez."));
        goHome();
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${HERE}?welcome=1`,
            data: { full_name: fullName.trim() },
          },
        });
        if (err) return setError(frenchError(err.message, "Création du compte impossible. Réessayez."));
        if (data.session) return goHome();
        setView("check-email");
      }
    }, "La connexion au serveur a échoué. Réessayez dans un instant.");
  };

  const sendCode = async (target: string) => {
    const name = fullName.trim();
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: target,
      options: name ? { data: { full_name: name } } : {},
    });
    if (err) {
      setError(frenchError(err.message, "Envoi du code impossible. Vérifiez le numéro."));
      return false;
    }
    setResendIn(30);
    return true;
  };

  const phoneSubmit = (e: FormEvent) => {
    e.preventDefault();
    const target = toInternationalPhone(dial, phoneTyped);
    if (!target) {
      setError("Ce numéro ne semble pas valide. Exemple : 0812345678.");
      return;
    }
    void run(async () => {
      if (await sendCode(target)) {
        setPhone(target);
        setOtp("");
        setView("otp");
      }
    }, "Envoi du code impossible. Réessayez dans un instant.");
  };

  const verifyCode = (code: string) =>
    run(async () => {
      const { error: err } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
      if (err) {
        setOtp("");
        return setError(frenchError(err.message, "Ce code est incorrect ou a expiré."));
      }
      goHome();
    }, "Vérification impossible. Réessayez.");

  const sendReset = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${HERE}?recover=1`,
      });
      setInfo("Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient d’être envoyé.");
    }, "Envoi impossible pour le moment. Réessayez dans un instant.");
  };

  const saveNewPassword = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) return setError(frenchError(err.message, "Modification impossible pour le moment."));
      recovering.current = false;
      window.history.replaceState(null, "", HERE);
      goHome();
    }, "Modification impossible pour le moment.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setPassword("");
    reset();
    setView("auth");
  };

  const who = session?.user.email || session?.user.phone || "";
  const whoName =
    (session?.user.user_metadata?.["full_name"] as string | undefined) ||
    (session?.user.user_metadata?.["name"] as string | undefined) ||
    "";

  return (
    <div lang="fr" className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <div className="relative flex min-h-screen flex-col bg-auth-glow px-5 py-5 sm:px-10 sm:py-7">
        <header className="flex items-center justify-between gap-4">
          <Brand />
          <div className="flex items-center gap-2">
            <a
              href="/site/index.html"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Retour au site
            </a>
            <ThemeMenu />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div key={view + mode} className="w-full max-w-[400px] animate-rise">
            {view === "loading" ? (
              <div aria-busy="true" className="space-y-4">
                <div className="h-9 w-2/3 animate-pulse rounded-lg bg-muted" />
                <div className="h-12 animate-pulse rounded-full bg-muted" />
                <div className="h-12 animate-pulse rounded-full bg-muted" />
              </div>
            ) : null}

            {view === "auth" ? (
              <>
                <Heading
                  title={mode === "login" ? "Se connecter" : "Créer votre compte"}
                  sub={
                    mode === "login"
                      ? "Heureux de vous revoir sur VetoCare."
                      : "Gratuit, en quelques secondes."
                  }
                />
                <Messages error={error} info={info} />

                <div className="space-y-3">
                  <Button type="button" variant="google" size="xl" onClick={google} disabled={busy}>
                    <GoogleMark />
                    Continuer avec Google
                  </Button>
                  <Button
                    type="button"
                    variant="soft"
                    size="xl"
                    disabled={busy}
                    onClick={() => {
                      setMethod(method === "email" ? "phone" : "email");
                      reset();
                    }}
                  >
                    {method === "email" ? <Phone aria-hidden="true" /> : <Mail aria-hidden="true" />}
                    {method === "email" ? "Continuer avec un téléphone" : "Continuer avec un email"}
                  </Button>
                </div>

                <Divider />

                {method === "email" ? (
                  <form onSubmit={emailSubmit} className="space-y-4">
                    {mode === "signup" ? (
                  <Field label="Votre nom" htmlFor="full-name">
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      placeholder="San Arsène"
                      required
                      maxLength={80}
                      className="h-12 rounded-xl bg-card px-4 text-base"
                    />
                  </Field>
                ) : null}
                    <Field label="Adresse email" htmlFor="email">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="vous@exemple.com"
                        required
                        className="h-12 rounded-xl bg-card px-4 text-base"
                      />
                    </Field>
                    <Field
                      label="Mot de passe"
                      htmlFor="password"
                      aside={
                        mode === "login" ? (
                          <button
                            type="button"
                            onClick={() => {
                              reset();
                              setView("forgot");
                            }}
                            className="text-[13px] font-semibold text-primary hover:text-primary-hover hover:underline"
                          >
                            Mot de passe oublié ?
                          </button>
                        ) : null
                      }
                    >
                      <PasswordInput
                        id="password"
                        value={password}
                        onChange={setPassword}
                        show={showPw}
                        onToggle={() => setShowPw((v) => !v)}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                      />
                      {mode === "signup" ? (
                        <p className="mt-1.5 text-[13px] text-muted-foreground">8 caractères minimum.</p>
                      ) : null}
                    </Field>
                    <Button type="submit" variant="brand" size="xl" disabled={busy}>
                      {busy ? "Un instant…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={phoneSubmit} className="space-y-4">
                    {mode === "signup" ? (
                  <Field label="Votre nom" htmlFor="full-name">
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      placeholder="San Arsène"
                      required
                      maxLength={80}
                      className="h-12 rounded-xl bg-card px-4 text-base"
                    />
                  </Field>
                ) : null}
                    <Field label="Numéro de téléphone" htmlFor="phone">
                      <div className="flex gap-2">
                        <select
                          aria-label="Indicatif du pays"
                          value={dial}
                          onChange={(e) => setDial(e.target.value)}
                          className="h-12 shrink-0 rounded-xl border border-input bg-card px-3 text-[15px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {DIAL_CODES.map((d) => (
                            <option key={d.code} value={d.code}>
                              {d.label} {d.code}
                            </option>
                          ))}
                        </select>
                        <Input
                          id="phone"
                          type="tel"
                          inputMode="tel"
                          value={phoneTyped}
                          onChange={(e) => setPhoneTyped(e.target.value)}
                          autoComplete="tel-national"
                          placeholder="081 234 5678"
                          required
                          className="h-12 rounded-xl bg-card px-4 text-base"
                        />
                      </div>
                      <p className="mt-1.5 text-[13px] text-muted-foreground">
                        Nous vous envoyons un code par SMS. Pas de mot de passe à retenir.
                      </p>
                    </Field>
                    <Button type="submit" variant="brand" size="xl" disabled={busy}>
                      {busy ? "Envoi…" : "Recevoir mon code"}
                    </Button>
                  </form>
                )}

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {mode === "login" ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}{" "}
                  <button
                    type="button"
                    onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                    className="font-bold text-primary underline underline-offset-4 hover:text-primary-hover"
                  >
                    {mode === "login" ? "Créez votre compte" : "Se connecter"}
                  </button>
                </p>
              </>
            ) : null}

            {view === "otp" ? (
              <>
                <BackLink onClick={() => { reset(); setView("auth"); }}>Changer de numéro</BackLink>
                <Heading title="Entrez votre code" sub={`Envoyé par SMS au ${phone}.`} />
                <Messages error={error} info={info} />
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      if (v.length === 6) void verifyCode(v);
                    }}
                    disabled={busy}
                    autoFocus
                  >
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="h-14 w-12 rounded-xl border bg-card text-xl font-bold first:rounded-xl last:rounded-xl"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  type="button"
                  variant="brand"
                  size="xl"
                  className="mt-6"
                  disabled={busy || otp.length < 6}
                  onClick={() => verifyCode(otp)}
                >
                  {busy ? "Vérification…" : "Valider"}
                </Button>
                <p className="mt-5 text-center text-sm text-muted-foreground">
                  Rien reçu ?{" "}
                  <button
                    type="button"
                    disabled={resendIn > 0 || busy}
                    onClick={() => run(async () => { if (await sendCode(phone)) setInfo("Nouveau code envoyé."); }, "Envoi impossible.")}
                    className="font-bold text-primary underline underline-offset-4 disabled:text-muted-foreground disabled:no-underline"
                  >
                    {resendIn > 0 ? `Renvoyer dans ${resendIn} s` : "Renvoyer le code"}
                  </button>
                </p>
              </>
            ) : null}

            {view === "forgot" ? (
              <>
                <BackLink onClick={() => { reset(); setView("auth"); }}>Retour à la connexion</BackLink>
                <Heading
                  title="Mot de passe oublié"
                  sub="Indiquez votre adresse : nous vous envoyons un lien pour en choisir un nouveau."
                />
                <Messages error={error} info={info} />
                <form onSubmit={sendReset} className="space-y-4">
                  <Field label="Adresse email" htmlFor="reset-email">
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      placeholder="vous@exemple.com"
                      required
                      className="h-12 rounded-xl bg-card px-4 text-base"
                    />
                  </Field>
                  <Button type="submit" variant="brand" size="xl" disabled={busy}>
                    {busy ? "Envoi…" : "Envoyer le lien"}
                  </Button>
                </form>
              </>
            ) : null}

            {view === "check-email" ? (
              <div className="text-center">
                <span className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-success-soft text-primary">
                  <MailCheck className="size-8" aria-hidden="true" />
                </span>
                <Heading
                  center
                  title="Vérifiez vos emails"
                  sub={`Nous avons envoyé un lien de confirmation à ${email}. Cliquez dessus pour activer votre compte : vous arriverez directement sur l’accueil.`}
                />
                <Button type="button" variant="soft" size="xl" onClick={() => { switchMode("login"); setView("auth"); }}>
                  Retour à la connexion
                </Button>
              </div>
            ) : null}

            {view === "recover" ? (
              <>
                <Heading title="Nouveau mot de passe" sub="Choisissez-le, il s’applique tout de suite à votre compte." />
                <Messages error={error} info={info} />
                <form onSubmit={saveNewPassword} className="space-y-4">
                  <Field label="Nouveau mot de passe" htmlFor="new-password">
                    <PasswordInput
                      id="new-password"
                      value={password}
                      onChange={setPassword}
                      show={showPw}
                      onToggle={() => setShowPw((v) => !v)}
                      autoComplete="new-password"
                    />
                  </Field>
                  <Button type="submit" variant="brand" size="xl" disabled={busy}>
                    {busy ? "Enregistrement…" : "Enregistrer et continuer"}
                  </Button>
                </form>
              </>
            ) : null}

            {view === "account" ? (
              <>
                <Heading title={whoName ? `Bonjour ${whoName.split(" ")[0]}` : "Vous êtes connecté"} sub="Votre compte VetoCare est actif sur cet appareil." />
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft-card">
                  <AccountAvatar session={session} />
                  <span className="min-w-0">
                    {whoName ? <b className="block truncate text-foreground">{whoName}</b> : null}
                    <span className="block truncate text-sm text-muted-foreground">{who}</span>
                  </span>
                </div>
                <div className="space-y-3">
                  <Button type="button" variant="brand" size="xl" onClick={goHome}>
                    Aller à l’accueil
                  </Button>
                  <Button type="button" variant="soft" size="xl" onClick={signOut}>
                    Se déconnecter
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </main>

        <footer className="space-y-2 text-center text-xs text-muted-foreground">
          <p>VetoCare · Santé animale pour tous</p>
          <LegalLinks />
        </footer>
      </div>

      <aside className="hidden p-4 lg:block">
        <AuthShowcase />
      </aside>
    </div>
  );
}

function Heading({ title, sub, center = false }: { title: string; sub: string; center?: boolean }) {
  return (
    <div className={cn("mb-7", center && "text-center")}>
      <h1 className="font-display text-[34px] font-normal leading-tight text-foreground sm:text-[38px]">{title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{sub}</p>
    </div>
  );
}

function Messages({ error, info }: { error: string; info: string }) {
  if (!error && !info) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "mb-5 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        error
          ? "border-destructive/25 bg-destructive-soft text-destructive"
          : "border-primary/20 bg-success-soft text-accent-foreground",
      )}
    >
      {error || info}
    </p>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      ou
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Field({
  label,
  htmlFor,
  aside,
  children,
}: {
  label: string;
  htmlFor: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-bold text-foreground">
          {label}
        </label>
        {aside}
      </div>
      {children}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  autoComplete: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        minLength={8}
        className="h-12 rounded-xl bg-card pl-4 pr-12 text-base"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}

function BackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </button>
  );
}

const AVATAR_BG = ["bg-av-0", "bg-av-1", "bg-av-2", "bg-av-3", "bg-av-4", "bg-av-5"];

function AccountAvatar({ session }: { session: Session | null }) {
  const [broken, setBroken] = useState(false);
  if (!session) {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-success-soft text-primary">
        <UserRound className="size-5" aria-hidden="true" />
      </span>
    );
  }
  const a = accountSummary(session.user);
  if (a.avatar && !broken) {
    return (
      <img
        src={a.avatar}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="size-11 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full font-display text-lg font-bold text-photo-foreground",
        AVATAR_BG[a.color],
      )}
    >
      {a.initial}
    </span>
  );
}
