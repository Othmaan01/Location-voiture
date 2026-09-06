import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-ink-200 bg-surface shadow-soft", className)}
      {...props}
    />
  );
}

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-ink-700 ring-1 ring-ink-200 ring-inset",
        ink: "bg-ink-900 text-ink-50",
        accent: "bg-brand-soft text-brand-tint ring-1 ring-brand/40 ring-inset",
        success: "bg-success/15 text-success ring-1 ring-success/30 ring-inset",
        warning: "bg-warning/15 text-warning ring-1 ring-warning/40 ring-inset",
        outline: "border border-ink-300 text-ink-600",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);
export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-ink-300 bg-surface-muted/60 px-6 py-14 text-center",
        className,
      )}
    >
      <p className="font-semibold text-ink-900">{title}</p>
      {description ? (
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
