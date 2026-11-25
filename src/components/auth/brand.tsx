import { cn } from "@/lib/utils";

/** VetoCare paw mark + wordmark, same drawing as the site header. */
export function Brand({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <a
      href="/site/index.html"
      aria-label="VetoCare, accueil"
      className={cn("inline-flex items-center gap-2.5 no-underline", className)}
    >
      <svg
        viewBox="0 0 32 36"
        aria-hidden="true"
        className={cn(
          "h-[34px] w-[30px] shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.65]",
          light ? "text-photo-accent" : "text-primary",
        )}
      >
        <ellipse cx="7" cy="12" rx="2.4" ry="3.2" transform="rotate(-24 7 12)" />
        <ellipse cx="12.5" cy="6.5" rx="2.5" ry="3.6" transform="rotate(-8 12.5 6.5)" />
        <ellipse cx="20" cy="6.5" rx="2.5" ry="3.6" transform="rotate(8 20 6.5)" />
        <ellipse cx="25.5" cy="12" rx="2.4" ry="3.2" transform="rotate(24 25.5 12)" />
        <path d="M16 15c-3.5 0-8 5.1-8 8.7 0 2.8 2.8 3.8 5 2.5 1.2-.7 1.9-1 3-1s1.8.3 3 1c2.2 1.3 5 .3 5-2.5C24 20.1 19.5 15 16 15Z" />
      </svg>
      <span
        className={cn(
          "font-display text-[26px] font-bold leading-none",
          light ? "text-photo-foreground" : "text-foreground",
        )}
      >
        Veto<span className={light ? "text-photo-accent" : "text-primary"}>Care</span>
      </span>
    </a>
  );
}
