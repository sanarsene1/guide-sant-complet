import { authUpdateError } from "@/lib/auth-helpers";
import { useState, type FormEvent } from "react";
import { Check, LogOut, PawPrint, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  addReminder,
  deleteAllQuizAttempts,
  deletePet,
  deleteReminder,
  savePet,
  setReminderDone,
  syncAccountCache,
  type Pet,
} from "@/lib/account-data";
import { cn } from "@/lib/utils";
import { PET_CATEGORIES, PET_CATEGORY_KEYS, petCategoryOf, type PetCategory } from "@/lib/pet-categories";
import { notifyReminderCreated } from "@/lib/push.functions";
import { REMINDER_KINDS, reminderHourText, reminderKindLabel } from "@/lib/reminder-schedule";
import { PushOptIn } from "./push-optin";
import { Empty, Msg, Panel, SectionTitle, frDate, todayIso, type SectionProps } from "./shared";


function age(birth: string | null) {
  if (!birth) return "";
  const m = Math.floor((Date.now() - Date.parse(birth)) / (1000 * 60 * 60 * 24 * 30.44));
  if (m < 0) return "";
  return m < 24 ? `${m} mois` : `${Math.floor(m / 12)} ans`;
}

const field = "h-11 rounded-xl bg-background";
const selectCls = "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground";

/* ---------- 10. Mes animaux ---------- */
export function Pets({ data, reload }: SectionProps) {
  const empty: { name: string; category: PetCategory; species: string; birth_date: string; notes: string; id?: string } = { name: "", category: "compagnie", species: "Chien", birth_date: "", notes: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await savePet({ ...(form.id ? { id: form.id } : {}), name: form.name.trim().slice(0, 60), category: form.category, species: form.species, birth_date: form.birth_date || null, notes: form.notes.slice(0, 1000) });
      setForm(empty);
      await reload();
    } catch {
      setError("Enregistrement impossible. Réessayez.");
    }
  };
  const edit = (p: Pet) => setForm({ id: p.id, name: p.name, category: petCategoryOf(p.category, p.species), species: p.species, birth_date: p.birth_date ?? "", notes: p.notes });
  const speciesList: readonly string[] = PET_CATEGORIES[form.category].species;
  const remove = async (p: Pet) => {
    if (!window.confirm(`Retirer ${p.name} de votre compte ? Ses rappels seront aussi supprimés.`)) return;
    await deletePet(p.id);
    await reload();
  };
  return (
    <>
      <SectionTitle title="Mes animaux" sub="Gardez une petite fiche pour chacun de vos animaux et suivez leurs soins." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          {data.pets.length ? (
            data.pets.map((p) => (
              <Panel key={p.id} className="flex items-start gap-4 p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-success-soft text-primary"><PawPrint className="size-6" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{[PET_CATEGORIES[petCategoryOf(p.category, p.species)].label, p.species, age(p.birth_date)].filter(Boolean).join(" · ")}</p>
                  {p.notes ? <p className="mt-1 text-sm text-foreground">{p.notes}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{data.reminders.filter((r) => r.pet_id === p.id && !r.done).length} rappel(s) à venir</p>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Modifier ${p.name}`} onClick={() => edit(p)}><Pencil /></Button>
                <Button variant="ghost" size="icon" aria-label={`Retirer ${p.name}`} onClick={() => remove(p)}><Trash2 /></Button>
              </Panel>
            ))
          ) : (
            <Empty title="Aucun animal" text="Ajoutez votre premier animal avec le formulaire." />
          )}
        </div>
        <Panel>
          <form onSubmit={submit} className="space-y-3">
            <p className="font-bold text-foreground">{form.id ? "Modifier l’animal" : "Ajouter un animal"}</p>
            <Msg error={error} />
            <label className="block text-sm font-semibold text-foreground">Nom<Input required maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={cn(field, "mt-1")} placeholder="Rex" /></label>
            <label className="block text-sm font-semibold text-foreground">Catégorie
              <select
                value={form.category}
                onChange={(e) => {
                  const category = e.target.value as PetCategory;
                  setForm({ ...form, category, species: PET_CATEGORIES[category].species[0] });
                }}
                className={cn(selectCls, "mt-1")}
              >
                {PET_CATEGORY_KEYS.map((k) => <option key={k} value={k}>{PET_CATEGORIES[k].label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground">Espèce
              <select value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })} className={cn(selectCls, "mt-1")}>
                {(speciesList.includes(form.species) ? speciesList : [form.species, ...speciesList]).map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-foreground">Date de naissance<Input type="date" max={todayIso()} value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className={cn(field, "mt-1")} /></label>
            <label className="block text-sm font-semibold text-foreground">Notes<Textarea maxLength={1000} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 bg-background" placeholder="Allergies, caractère, poids…" /></label>
            <div className="flex gap-2">
              <Button type="submit" variant="brand" className="rounded-full">{form.id ? "Enregistrer" : "Ajouter"}</Button>
              {form.id ? <Button type="button" variant="ghost" className="rounded-full" onClick={() => setForm(empty)}>Annuler</Button> : null}
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}

/* ---------- 11. Rappels de soins ---------- */
export function Reminders({ data, reload }: SectionProps) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("vaccin");
  const [customKind, setCustomKind] = useState("");
  const [petLabel, setPetLabel] = useState("");
  const [date, setDate] = useState(todayIso());
  const [hour, setHour] = useState("");
  const [error, setError] = useState("");
  const today = todayIso();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const typed = kind === "autre" ? customKind.trim().slice(0, 60) : "";
      const finalKind = kind === "autre" ? typed || "autre" : kind;
      const id = await addReminder({
        title: title.trim().slice(0, 120) || reminderKindLabel(finalKind),
        kind: finalKind,
        pet_id: null,
        pet_label: petLabel.trim().slice(0, 60),
        due_date: date,
        remind_hour: hour === "" ? null : Number(hour),
      });
      setTitle("");
      setCustomKind("");
      setPetLabel("");
      void notifyReminderCreated({ data: { id } }).catch(() => undefined);
      await reload();
    } catch {
      setError("Ajout impossible. Réessayez.");
    }
  };
  const open = data.reminders.filter((r) => !r.done);
  const done = data.reminders.filter((r) => r.done);
  const petName = (r: { pet_id: string | null; pet_label?: string }) => (r.pet_id ? data.pets.find((p) => p.id === r.pet_id)?.name : r.pet_label) || "Tous mes animaux";
  return (
    <>
      <SectionTitle title="Rappels de soins" sub="Vaccins, vermifuges, visites : notez la date pour ne rien oublier." />
      <PushOptIn text="Une notification à la création du rappel, puis la veille et le jour même." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          {open.length ? open.map((r) => {
            const late = r.due_date < today;
            return (
              <Panel key={r.id} className="flex items-center gap-3 p-4">
                <button type="button" aria-label="Marquer comme fait" onClick={async () => { await setReminderDone(r.id, true); await reload(); }} className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-input hover:border-primary hover:text-primary"><Check className="size-4 opacity-0 hover:opacity-100" /></button>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{reminderKindLabel(r.kind)} · {petName(r)}{typeof r.remind_hour === "number" ? ` · rappel à ${r.remind_hour} h` : ""}</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", late ? "bg-destructive-soft text-destructive" : "bg-success-soft text-accent-foreground")}>{late ? "En retard · " : ""}{frDate(r.due_date)}</span>
                <Button variant="ghost" size="icon" aria-label="Supprimer le rappel" onClick={async () => { await deleteReminder(r.id); await reload(); }}><Trash2 /></Button>
              </Panel>
            );
          }) : <Empty title="Aucun rappel à venir" text="Ajoutez le prochain vaccin ou vermifuge avec le formulaire." />}
          {done.length ? (
            <details className="rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-bold text-foreground">Soins faits ({done.length})</summary>
              <ul className="mt-3 space-y-2">
                {done.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 text-primary" /> <span className="flex-1">{r.title} · {petName(r)} · {frDate(r.due_date)}</span>
                    <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={async () => { await setReminderDone(r.id, false); await reload(); }}>Annuler</button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
        <Panel>
          <form onSubmit={submit} className="space-y-3">
            <p className="font-bold text-foreground">Nouveau rappel</p>
            <Msg error={error} />
            <label className="block text-sm font-semibold text-foreground">Type
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={cn(selectCls, "mt-1")}>
                {Object.entries(REMINDER_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                <option value="autre">Autre soin (je l’écris)</option>
              </select>
            </label>
            {kind === "autre" ? (
              <label className="block text-sm font-semibold text-foreground">Quel soin ?<Input maxLength={60} value={customKind} onChange={(e) => setCustomKind(e.target.value)} className={cn(field, "mt-1")} placeholder="Coupe des griffes, bain, pesée…" /></label>
            ) : null}
            <label className="block text-sm font-semibold text-foreground">Intitulé<Input maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={cn(field, "mt-1")} placeholder="Vaccin contre la rage" /></label>
            <label className="block text-sm font-semibold text-foreground">Animal<Input maxLength={60} value={petLabel} onChange={(e) => setPetLabel(e.target.value)} className={cn(field, "mt-1")} placeholder="Rex, mes chèvres, les poules…" />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">Écrivez librement le nom ou le groupe d’animaux concerné.</span>
            </label>
            <label className="block text-sm font-semibold text-foreground">Date<Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={cn(field, "mt-1")} /></label>
            <label className="block text-sm font-semibold text-foreground">Heure du rappel
              <select value={hour} onChange={(e) => setHour(e.target.value)} className={cn(selectCls, "mt-1")}>
                <option value="">Automatique (18 h la veille, 8 h le jour même)</option>
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h} h</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-muted-foreground">Notification {reminderHourText(hour === "" ? null : Number(hour))}.</span>
            </label>
            <Button type="submit" variant="brand" className="rounded-full">Ajouter le rappel</Button>
          </form>
        </Panel>
      </div>
    </>
  );
}

/* ---------- 12. Mon profil ---------- */
export { Profile } from "./profile";

/* ---------- 13. Sécurité et données ---------- */
export function Security({ data, reload }: SectionProps) {
  const [email, setEmail] = useState(data.user.email ?? "");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ error?: string; info?: string }>({});
  const changeEmail = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/mon-compte?tab=securite` });
    setMsg(error ? { error: authUpdateError(error, "email") } : { info: "Ouvrez le lien envoyé à votre nouvelle adresse pour confirmer (et à l’ancienne si demandé). L’adresse change seulement après ce clic." });
  };
  const changePw = async (e: FormEvent) => {
    e.preventDefault();
    const { data: upd, error } = await supabase.auth.updateUser({ password: pw });
    setPw("");
    setMsg(error ? { error: authUpdateError(error, "password") } : { info: "Mot de passe modifié. Utilisez-le à votre prochaine connexion." });
    if (!error && upd.user) await reload(upd.user);
  };
  const wipe = async () => {
    if (!window.confirm("Effacer tout l’historique de vos quiz ? Cette action est définitive.")) return;
    await deleteAllQuizAttempts(data.user.id);
    setMsg({ info: "Historique des quiz effacé." });
    await reload();
  };
  const signOut = async () => {
    syncAccountCache(null);
    await supabase.auth.signOut();
    window.location.replace("/espace-veterinaire");
  };
  return (
    <>
      <SectionTitle title="Sécurité et données" sub="Adresse email, mot de passe et gestion de vos données." />
      <div className="max-w-xl space-y-4">
        <Msg {...msg} />
        <Panel>
          <form onSubmit={changeEmail} className="space-y-2">
            <label htmlFor="sc-email" className="text-sm font-bold text-foreground">Adresse email</label>
            <div className="flex gap-2">
              <Input id="sc-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
              <Button type="submit" variant="brand" className="h-11 rounded-full" disabled={email.trim() === (data.user.email ?? "")}>Changer</Button>
            </div>
            {data.user.phone ? <p className="text-sm text-muted-foreground">Téléphone : +{data.user.phone.replace(/^\+/, "")}</p> : null}
          </form>
        </Panel>
        <Panel>
          <form onSubmit={changePw} className="space-y-2">
            <label htmlFor="sc-pw" className="text-sm font-bold text-foreground">Nouveau mot de passe</label>
            <div className="flex gap-2">
              <Input id="sc-pw" type="password" minLength={8} required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={field} placeholder="8 caractères minimum" />
              <Button type="submit" variant="brand" className="h-11 rounded-full">Modifier</Button>
            </div>
          </form>
        </Panel>
        <Panel className="space-y-3">
          <p className="font-bold text-foreground">Mes données</p>
          <p className="text-sm text-muted-foreground">{data.quizzes.length} quiz · {data.exams.length} examens · {data.pets.length} animaux · {data.reminders.length} rappels</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" className="rounded-full" disabled={!data.quizzes.length} onClick={wipe}><Trash2 /> Effacer l’historique des quiz</Button>
            <Button variant="destructive" className="rounded-full" onClick={signOut}><LogOut /> Se déconnecter</Button>
          </div>
        </Panel>
        <Panel className="space-y-3">
          <p className="font-bold text-foreground">Cookies et notifications</p>
          <p className="text-sm text-muted-foreground">Changez à tout moment la mesure d’audience et les notifications sur ce téléphone.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" className="rounded-full" onClick={() => window.vcConsent?.open()}>Paramètres des cookies</Button>
            <Button asChild variant="ghost" className="rounded-full"><a href="/cookies">Politique de cookies</a></Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
