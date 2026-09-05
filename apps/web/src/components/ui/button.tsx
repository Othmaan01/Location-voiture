import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950",
        accent: "bg-amber-brand text-ink-950 hover:bg-amber-brand-dark hover:text-white",
        outline: "border border-ink-200 bg-surface text-ink-800 hover:bg-surface-muted",
        ghost: "text-ink-700 hover:bg-surface-muted",
        subtle: "bg-surface-muted text-ink-800 hover:bg-ink-100",
        danger: "bg-danger text-white hover:opacity-90",
        link: "text-ink-900 underline underline-offset-4 hover:text-amber-brand-dark",
      },
      size: {
        sm: "h-9 px-3.5 text-sm [&_svg]:size-4",
        md: "h-11 px-5 text-sm [&_svg]:size-4",
        lg: "h-13 px-7 text-base [&_svg]:size-5",
        icon: "size-10 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonBaseProps = VariantProps<typeof buttonVariants> & { className?: string };

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & ButtonBaseProps;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export type ButtonLinkProps = React.ComponentProps<typeof Link> & ButtonBaseProps;

export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
