import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M16.37 12.63c-.02-2.36 1.93-3.5 2.02-3.55-1.1-1.61-2.81-1.83-3.42-1.85-1.46-.15-2.85.86-3.59.86-.74 0-1.88-.84-3.09-.82-1.59.02-3.06.93-3.88 2.35-1.66 2.87-.42 7.12 1.19 9.45.79 1.14 1.73 2.42 2.96 2.37 1.19-.05 1.64-.77 3.08-.77 1.44 0 1.84.77 3.1.75 1.28-.02 2.09-1.16 2.87-2.31.9-1.32 1.28-2.6 1.3-2.67-.03-.01-2.5-.96-2.54-3.81ZM14.02 5.7c.65-.79 1.09-1.89.97-2.99-.94.04-2.08.63-2.75 1.42-.6.7-1.13 1.82-.99 2.9 1.05.08 2.12-.53 2.77-1.33Z" />
    </svg>
  );
}

function PlayLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        d="M3.6 2.4c-.3.3-.5.8-.5 1.4v16.4c0 .6.2 1.1.5 1.4l.1.1 9.2-9.2v-.2L3.7 2.3l-.1.1Z"
        fill="#4285F4"
      />
      <path
        d="M15.9 15.6l-3-3.1v-.2l3-3.1.1.1 3.6 2.1c1 .6 1 1.6 0 2.2l-3.6 2.1-.1-.1Z"
        fill="#FBBC04"
      />
      <path d="M16 15.5 12.9 12.3 3.6 21.6c.3.4.9.4 1.5.1L16 15.5Z" fill="#EA4335" />
      <path d="M16 9.1 5.1 2.9c-.6-.4-1.2-.3-1.5.1l9.3 9.3L16 9.1Z" fill="#34A853" />
    </svg>
  );
}

function StoreBadge({
  href,
  icon,
  top,
  bottom,
  label,
  size,
}: {
  href: string;
  icon: React.ReactNode;
  top: string;
  bottom: string;
  label: string;
  size: "md" | "lg";
}) {
  const h = size === "lg" ? "h-14 px-5" : "h-12 px-4";
  return (
    <a
      href={href}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-3 rounded-xl border border-ink-300 bg-ink-50 text-ink-900 transition-colors hover:border-ink-500",
        h,
      )}
    >
      {icon}
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-medium uppercase tracking-wide text-ink-600">{top}</span>
        <span className={cn("font-bold", size === "lg" ? "text-lg" : "text-base")}>{bottom}</span>
      </span>
    </a>
  );
}

/**
 * Badges App Store / Google Play. Sans lien configure, le badge annonce "bientot" et mene
 * a la page application (liste d'attente). Les logos sont des reproductions vectorielles.
 */
export function StoreBadges({
  className,
  size = "md",
}: {
  className?: string;
  size?: "md" | "lg";
}) {
  const ready = { apple: publicEnv.appStoreUrl, play: publicEnv.playStoreUrl };
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <StoreBadge
        size={size}
        href={ready.apple || "/application#bientot"}
        icon={<AppleLogo className={size === "lg" ? "size-7" : "size-6"} />}
        top={ready.apple ? "Télécharger sur" : "Bientôt sur"}
        bottom="App Store"
        label="Télécharger sur l'App Store"
      />
      <StoreBadge
        size={size}
        href={ready.play || "/application#bientot"}
        icon={<PlayLogo className={size === "lg" ? "size-7" : "size-6"} />}
        top={ready.play ? "Disponible sur" : "Bientôt sur"}
        bottom="Google Play"
        label="Disponible sur Google Play"
      />
    </div>
  );
}
