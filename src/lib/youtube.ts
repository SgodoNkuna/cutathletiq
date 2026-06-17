/** Extract a YouTube video id from any common URL shape. Returns null when invalid. */
export function youTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = url.trim();
  if (!s) return null;
  // Accept bare 11-char id.
  if (/^[\w-]{11}$/.test(s)) return s;
  const patterns: RegExp[] = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?[^#]*v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/v\/([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

export function isValidYouTubeUrl(url: string | null | undefined): boolean {
  return !!youTubeId(url);
}

export function youTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = youTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null;
}

export function youTubeThumb(url: string | null | undefined): string | null {
  const id = youTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
