import { useCallback, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, Eye, ImagePlus, Mail, Pencil, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { syncAccountCache, uploadAvatar } from "@/lib/account-data";
import { accountSummary, authUpdateError } from "@/lib/auth-helpers";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./avatar";
import { Msg, Panel, SectionTitle, frDate, type SectionProps } from "./shared";

const field = "h-11 rounded-xl bg-background";

/** Suggestions de statut ; la personne peut aussi écrire le sien. */
export const STATUS_SUGGESTIONS = [
  "Élève agronome",
  "Étudiant(e) en agronomie",
  "Master en agronomie",
  "Ingénieur(e) agronome",
  "Technicien(ne) agricole",
  "Étudiant(e) vétérinaire",
  "Auxiliaire vétérinaire",
  "Vétérinaire",
  "Éleveur / Éleveuse",
  "Passionné(e) d’animaux",
];

/** Découpe la zone choisie de l’image en un carré JPEG de 512 px. */
async function cropToFile(src: string, area: Area): Promise<File> {
  const img = await new Promise<HTMLImageElement>((ok, ko) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = ko;
    i.src = src;
  });
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.9));
  if (!blob) throw new Error("blob");
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export function Profile({ data, reload }: SectionProps) {
  const a = accountSummary(data.user);
  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const status = typeof meta["vc_status"] === "string" ? (meta["vc_status"] as string) : "";
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; info?: string }>({});
  const [sheet, setSheet] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onCropComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  // Affiche tout de suite le compte à jour (sans attendre l’ancienne session gardée en mémoire).
  const after = async (info: string, fresh?: User) => {
    setMsg({ info });
    const { data: s } = await supabase.auth.getSession();
    syncAccountCache(s.session);
    await reload(fresh ?? s.session?.user);
  };

  const pickFile = (f: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/") || f.size > 10 * 1024 * 1024) {
      setMsg({ error: "Choisissez une image de moins de 10 Mo." });
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropSrc(URL.createObjectURL(f));
  };

  const closeCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const savePhoto = async () => {
    if (!cropSrc || !area) return;
    setBusy(true);
    try {
      const file = await cropToFile(cropSrc, area);
      const url = await uploadAvatar(data.user.id, file);
      // Précharge l’image pour qu’elle s’affiche instantanément une fois enregistrée.
      await new Promise<void>((ok) => { const i = new Image(); i.onload = () => ok(); i.onerror = () => ok(); i.src = url; });
      const { data: upd, error: err } = await supabase.auth.updateUser({ data: { vc_avatar: url } });
      if (err || !upd.user) throw err ?? new Error("update");
      closeCrop();
      await after("Photo mise à jour.", upd.user);
    } catch {
      setMsg({ error: "Envoi de la photo impossible. Réessayez." });
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    setSheet(false);
    setBusy(true);
    const { data: upd, error: err } = await supabase.auth.updateUser({ data: { vc_avatar: "none" } });
    setBusy(false);
    if (err || !upd.user) return setMsg({ error: "Impossible de retirer la photo. Réessayez." });
    await after("Photo retirée.", upd.user);
  };

  const sheetItem = "flex w-full items-center justify-center gap-2 px-4 py-3.5 text-[15px] font-semibold transition-colors hover:bg-muted";

  return (
    <>
      <SectionTitle title="Mon profil" />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickFile(e.target.files?.[0])} />
      <Panel className="max-w-xl">
        <Msg {...msg} />
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
          <button
            type="button"
            onClick={() => setSheet(true)}
            disabled={busy}
            aria-label="Photo de profil : changer, voir ou retirer"
            className="group relative shrink-0 rounded-full outline-none ring-offset-2 ring-offset-card focus-visible:ring-2 focus-visible:ring-primary"
          >
            <UserAvatar user={data.user} className={cn("size-24 text-4xl transition-opacity group-hover:opacity-90", busy && "opacity-60")} />
            <span className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm">
              <Camera className="size-4" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-2xl text-foreground">{a.name || "Sans nom"}</p>
            {status ? <p className="mt-0.5 text-sm font-semibold text-primary">{status}</p> : null}
            {data.user.email ? <p className="mt-1 truncate text-sm text-muted-foreground">{data.user.email}</p> : null}
            <p className="mt-1 text-xs text-muted-foreground">Membre depuis le {frDate(data.user.created_at)}</p>
          </div>
        </div>
        <Button variant="soft" className="mt-5 w-full rounded-full" onClick={() => setEditing(true)}>
          <Pencil /> Modifier le profil
        </Button>
      </Panel>

      {/* Menu de la photo, façon Instagram */}
      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent className="max-w-xs gap-0 overflow-hidden rounded-2xl p-0 [&>button]:hidden">
          <DialogHeader className="items-center border-b border-border px-4 py-5">
            <UserAvatar user={data.user} className="size-14 text-xl" />
            <DialogTitle className="pt-2 text-base">Photo de profil</DialogTitle>
            <DialogDescription className="sr-only">Changer, voir ou retirer votre photo.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col">
          <button type="button" className={cn(sheetItem, "text-primary")} onClick={() => { setSheet(false); fileRef.current?.click(); }}>
            <ImagePlus className="size-4" /> {a.avatar ? "Changer la photo" : "Ajouter une photo"}
          </button>
          {a.avatar ? (
            <>
              <button type="button" className={cn(sheetItem, "border-t border-border text-foreground")} onClick={() => { setSheet(false); setViewing(true); }}>
                <Eye className="size-4" /> Voir la photo
              </button>
              <button type="button" className={cn(sheetItem, "border-t border-border text-destructive")} onClick={removePhoto}>
                <Trash2 className="size-4" /> Retirer la photo
              </button>
            </>
          ) : null}
          <button type="button" className={cn(sheetItem, "border-t border-border font-normal text-muted-foreground")} onClick={() => setSheet(false)}>
            Annuler
          </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Voir la photo en grand */}
      <Dialog open={viewing} onOpenChange={setViewing}>
        <DialogContent className="max-w-sm rounded-2xl p-4">
          <DialogTitle className="sr-only">Votre photo de profil</DialogTitle>
          <DialogDescription className="sr-only">Photo affichée en grand.</DialogDescription>
          {a.avatar ? <img src={a.avatar} alt="Votre photo de profil" referrerPolicy="no-referrer" className="aspect-square w-full rounded-full object-cover" /> : null}
        </DialogContent>
      </Dialog>

      {/* Recadrer avant d’enregistrer */}
      <Dialog open={!!cropSrc} onOpenChange={(o) => (!o && !busy ? closeCrop() : null)}>
        <DialogContent className="max-w-md gap-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Recadrer la photo</DialogTitle>
            <DialogDescription>Déplacez l’image et zoomez pour bien centrer votre visage.</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
            {cropSrc ? (
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground">Zoom</span>
            <Slider aria-label="Zoom" min={1} max={3} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0] ?? 1)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="rounded-full" disabled={busy} onClick={closeCrop}>Annuler</Button>
            <Button variant="brand" className="rounded-full" disabled={busy || !area} onClick={savePhoto}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditProfile open={editing} onOpenChange={setEditing} data={data} status={status} onDone={after} />
    </>
  );
}

function EditProfile({
  open,
  onOpenChange,
  data,
  status,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: SectionProps["data"];
  status: string;
  onDone: (info: string, fresh?: User) => Promise<void>;
}) {
  const a = accountSummary(data.user);
  const [name, setName] = useState(a.name);
  const [st, setSt] = useState(status);
  const [email, setEmail] = useState(data.user.email ?? "");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = (o: boolean) => {
    if (o) {
      setName(a.name);
      setSt(status);
      setEmail(data.user.email ?? "");
      setPw("");
      setError("");
    }
    onOpenChange(o);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const n = name.trim().slice(0, 80);
    const s = st.trim().slice(0, 60);
    const em = email.trim();
    if (!n) return setError("Indiquez votre nom.");
    if (pw && pw.length < 8) return setError("Le mot de passe doit faire au moins 8 caractères.");
    setBusy(true);
    const infos: string[] = [];
    let fresh: User | undefined;
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setBusy(false); return setError("Adresse email invalide."); }
    if (n !== a.name || s !== status) {
      const { data: upd, error: err } = await supabase.auth.updateUser({ data: { vc_name: n, vc_status: s } });
      if (err) { setBusy(false); return setError("Modification du profil impossible pour le moment."); }
      fresh = upd.user ?? fresh;
      infos.push("Profil enregistré.");
    }
    if (em && em !== (data.user.email ?? "")) {
      const { error: err } = await supabase.auth.updateUser({ email: em }, { emailRedirectTo: `${window.location.origin}/mon-compte?tab=profil` });
      if (err) { setBusy(false); return setError(authUpdateError(err, "email")); }
      infos.push("Ouvrez le lien envoyé à votre nouvelle adresse pour confirmer (et à l’ancienne si demandé). L’adresse change seulement après ce clic.");
    }
    if (pw) {
      const { data: upd, error: err } = await supabase.auth.updateUser({ password: pw });
      if (err) { setBusy(false); return setError(authUpdateError(err, "password")); }
      fresh = upd.user ?? fresh;
      infos.push("Mot de passe modifié.");
    }
    setBusy(false);
    onOpenChange(false);
    if (infos.length) await onDone(infos.join(" "), fresh);
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>Changez seulement ce que vous voulez, puis enregistrez.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error ? <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive-soft px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <div className="space-y-1.5">
            <label htmlFor="ep-name" className="flex items-center gap-1.5 text-sm font-bold text-foreground"><UserRound className="size-4" /> Nom affiché</label>
            <Input id="ep-name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ep-status" className="text-sm font-bold text-foreground">Je suis…</label>
            <Input id="ep-status" maxLength={60} value={st} onChange={(e) => setSt(e.target.value)} placeholder="Ex. Étudiant(e) en agronomie" className={field} />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {STATUS_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSt(s)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    st === s ? "border-primary bg-nav-active text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ep-email" className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Mail className="size-4" /> Adresse email</label>
            <Input id="ep-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ep-pw" className="text-sm font-bold text-foreground">Nouveau mot de passe</label>
            <Input id="ep-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Laisser vide pour le garder" className={field} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" className="rounded-full" disabled={busy} onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" variant="brand" className="rounded-full" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
