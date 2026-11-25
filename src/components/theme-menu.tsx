import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { applyTheme, readTheme, saveTheme, type ThemeChoice } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Clair", icon: Sun },
  { id: "dark", label: "Sombre", icon: Moon },
  { id: "system", label: "Automatique", icon: Monitor },
];

/** Hook partagé : thème choisi, suit aussi le réglage de l'appareil en mode automatique. */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>("system");
  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readTheme() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const choose = (t: ThemeChoice) => {
    saveTheme(t);
    setTheme(t);
  };
  return { theme, choose };
}

/** Bouton « Apparence » : clair, sombre ou automatique. */
export function ThemeMenu({ className }: { className?: string }) {
  const { theme, choose } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="iconSoft" size="iconRound" aria-label="Changer l’apparence" className={className}>
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
        <DropdownMenuLabel className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Apparence</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((o) => (
          <DropdownMenuItem key={o.id} onSelect={() => choose(o.id)} className="cursor-pointer gap-2.5 rounded-lg py-2">
            <o.icon className="size-4 text-muted-foreground" />
            <span className="flex-1">{o.label}</span>
            <Check className={cn("size-4 text-primary", theme === o.id ? "opacity-100" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Version en ligne (dans le menu mobile) : trois boutons côte à côte. */
export function ThemeSwitch() {
  const { theme, choose } = useTheme();
  return (
    <div role="radiogroup" aria-label="Apparence" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={theme === o.id}
          onClick={() => choose(o.id)}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[13px] font-semibold transition-colors",
            theme === o.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <o.icon className="size-4" /> {o.label === "Automatique" ? "Auto" : o.label}
        </button>
      ))}
    </div>
  );
}
