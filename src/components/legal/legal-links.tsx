import { LEGAL_LINKS } from "@/lib/legal";
import { cn } from "@/lib/utils";

export function LegalLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={cn("flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs", className)}>
      {LEGAL_LINKS.map((l) => (
        <a key={l.href} href={l.href} className="text-muted-foreground underline underline-offset-2 transition-colors hover:text-primary">
          {l.label}
        </a>
      ))}
    </nav>
  );
}

