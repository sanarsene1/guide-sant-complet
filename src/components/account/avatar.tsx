import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { accountSummary } from "@/lib/auth-helpers";
import { cn } from "@/lib/utils";

const AVATAR_BG = ["bg-av-0", "bg-av-1", "bg-av-2", "bg-av-3", "bg-av-4", "bg-av-5"];

export function UserAvatar({ user, className }: { user: User; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  const a = accountSummary(user);
  if (a.avatar && broken !== a.avatar) {
    return (
      <img
        src={a.avatar}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(a.avatar)}
        className={cn("size-11 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full font-display text-lg font-bold text-photo-foreground",
        AVATAR_BG[a.color],
        className,
      )}
    >
      {a.initial}
    </span>
  );
}
