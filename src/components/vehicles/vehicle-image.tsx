import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Visuel de vehicule avec repli elegant : tant qu'aucune photo n'est
 * televersee, on affiche une silhouette generee plutot qu'une image cassee.
 */
export function VehicleImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-surface-muted", className)}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden image-fallback",
        className,
      )}
      aria-label={alt}
      role="img"
    >
      <svg viewBox="0 0 120 52" className="w-2/3 max-w-44 text-ink-300" fill="none">
        <path
          d="M8 36h104M18 36a7 7 0 1 0 14 0 7 7 0 1 0-14 0M88 36a7 7 0 1 0 14 0 7 7 0 1 0-14 0"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M10 36V27c0-2.2 1.6-4.1 3.8-4.4l14-2 9.4-7.2A10 10 0 0 1 43.3 11h24.4a10 10 0 0 1 6.7 2.6l10.3 9.4 15.6 2.6A6 6 0 0 1 105 31.5V36"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M42 13v10M62 12v11" stroke="currentColor" strokeWidth="2.5" />
      </svg>
    </div>
  );
}
