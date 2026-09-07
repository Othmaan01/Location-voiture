import { cn } from "@/lib/utils";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-tint">{children}</p>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  text,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  text?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl space-y-3", align === "center" ? "mx-auto text-center" : "")}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="text-2xl font-extrabold text-ink-900 md:text-4xl">{title}</h2>
      {text ? <p className="text-base text-ink-600 md:text-lg">{text}</p> : null}
    </div>
  );
}
