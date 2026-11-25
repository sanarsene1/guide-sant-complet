import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import type { CourseNote, CourseProgressRow, Pet, Reminder } from "@/lib/account-data";
import type { Goal } from "@/lib/goals";
import type { ExamResult } from "@/lib/formations/grading";
import type { QuizAttempt } from "@/lib/quiz-history";
import { cn } from "@/lib/utils";

export type AccountData = {
  user: User;
  quizzes: QuizAttempt[];
  progress: Record<string, CourseProgressRow>;
  exams: ExamResult[];
  pets: Pet[];
  reminders: Reminder[];
  notes: CourseNote[];
  goals: Goal[];
};

export type SectionProps = {
  data: AccountData;
  reload: (freshUser?: User) => Promise<void>;
  go: (tab: string) => void;
  who: string;
};

export function SectionTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[30px] leading-tight text-foreground">{title}</h2>
        {sub ? <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-border bg-card p-5 shadow-soft-card", className)}>{children}</div>;
}

export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-input bg-card px-6 py-10 text-center">
      <p className="font-bold text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{text}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Stat({ label, value, hint, action }: { label: string; value: ReactNode; hint?: string; action?: ReactNode }) {
  return (
    <Panel className="flex h-full min-w-0 flex-col rounded-3xl p-3.5 sm:p-5">
      <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.08em] text-muted-foreground sm:text-xs sm:tracking-[0.12em]">{label}</p>
      <p className="mt-2 font-display text-4xl leading-none text-foreground sm:text-[40px]">{value}</p>
      {hint ? <p className="mt-2 text-xs leading-snug text-muted-foreground sm:text-[13px]">{hint}</p> : null}
      {action ? <div className="mt-auto pt-4">{action}</div> : null}
    </Panel>
  );
}

export function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Msg({ error, info }: { error?: string; info?: string }) {
  if (!error && !info) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "mb-4 rounded-xl border px-4 py-3 text-sm",
        error ? "border-destructive/25 bg-destructive-soft text-destructive" : "border-primary/20 bg-success-soft text-accent-foreground",
      )}
    >
      {error || info}
    </p>
  );
}

export const frNote = (n: number) => String(n).replace(".", ",");
export const frDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
export const todayIso = () => new Date().toISOString().slice(0, 10);
