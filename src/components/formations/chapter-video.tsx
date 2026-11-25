import { useState } from "react";
import { Play, TriangleAlert } from "lucide-react";
import type { ChapterVideo } from "@/lib/formations/types";

/**
 * Lecteur d’une seule vidéo YouTube : miniature d’abord, puis lecteur intégré au clic.
 * Le cadre est isolé (pas de fenêtres ni de navigation vers YouTube) pour ne lire que cette vidéo.
 */
export function ChapterVideoPlayer({ video }: { video: ChapterVideo }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-video bg-muted">
        {playing ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 size-full" aria-label={`Lire la vidéo : ${video.title}`}>
            <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover" />
            <span className="absolute inset-0 bg-foreground/25 transition-colors group-hover:bg-foreground/35" />
            <span className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform group-hover:scale-105">
              <Play className="size-7 translate-x-0.5 fill-current" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <figcaption className="space-y-2 px-4 py-3">
        <p className="text-[15px] font-bold text-foreground">{video.title}</p>
        <p className="text-xs text-muted-foreground">Vidéo : {video.source}</p>
        {video.note ? (
          <p className="flex gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-award-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {video.note}
          </p>
        ) : null}
      </figcaption>
    </figure>
  );
}
