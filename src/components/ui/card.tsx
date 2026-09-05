import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-ink-100 bg-surface shadow-soft",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1 p-5 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold text-ink-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-3 p-5 pt-0", className)} {...props} />;
}

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-ink-700 ring-1 ring-ink-100 ring-inset",
        ink: "bg-ink-900 text-white",
        accent: "bg-amber-brand-soft text-ink-900 ring-1 ring-amber-brand/40 ring-inset",
        success: "bg-success/12 text-success ring-1 ring-success/25 ring-inset",
        warning: "bg-warning/15 text-ink-800 ring-1 ring-warning/40 ring-inset",
        danger: "bg-danger/10 text-danger ring-1 ring-danger/25 ring-inset",
        outline: "border border-ink-200 text-ink-600",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-ink-200 bg-surface-muted/60 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? <div className="text-ink-300">{icon}</div> : null}
      <div className="space-y-1">
        <p className="font-semibold text-ink-900">{title}</p>
        {description ? (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
