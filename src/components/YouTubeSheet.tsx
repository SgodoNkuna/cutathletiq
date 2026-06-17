import * as React from "react";
import { X } from "lucide-react";
import { youTubeEmbedUrl } from "@/lib/youtube";

/** Bottom-sheet YouTube player — embedded, no app navigation. */
export function YouTubeSheet({
  url,
  title,
  onClose,
}: {
  url: string | null;
  title?: string;
  onClose: () => void;
}) {
  const embed = youTubeEmbedUrl(url);
  // Lock body scroll while open.
  React.useEffect(() => {
    if (!embed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embed]);
  if (!embed) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Video"}
    >
      <div
        className="w-full max-w-xl bg-card rounded-t-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <div className="text-sm font-bold truncate">{title ?? "Demo video"}</div>
          <button
            onClick={onClose}
            aria-label="Close video"
            className="h-8 w-8 rounded-full bg-secondary hover:bg-border flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embed}
            title={title ?? "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
