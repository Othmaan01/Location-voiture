"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Loader2, User } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { cn, slugify } from "@/lib/utils";
import { fieldErrors, signUpSchema } from "@/lib/validators";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<"client" | "pro">(
    searchParams.get("profil") === "pro" ? "pro" : "client",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Supabase n'est pas configure. Renseignez .env.local (voir .env.example).");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
      role,
      phone: formData.get("phone") || undefined,
      companyName: formData.get("companyName") || undefined,
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);

    const input = parsed.data;
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          role: input.role,
          full_name: input.fullName,
          phone: input.phone ?? null,
          company_name: input.companyName ?? null,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Session immediate (confirmation e-mail desactivee) : on cree l'agence.
    if (data.session && input.role === "pro" && input.companyName) {
      const base = slugify(input.companyName) || "agence";
      await supabase.from("agencies").insert({
        owner_id: data.session.user.id,
        name: input.companyName,
        slug: `${base}-${Math.random().toString(36).slice(2, 7)}`,
        email: input.email,
        phone: input.phone ?? null,
        status: "draft",
      });
    }

    setLoading(false);

    if (!data.session) {
      toast.success("Compte cree. Confirmez votre adresse e-mail pour vous connecter.");
      router.push("/connexion");
      return;
    }

    toast.success("Bienvenue sur RentMap.");
    router.push(input.role === "pro" ? "/dashboard" : "/compte");
    router.refresh();
  }

  return (
    <AuthLayout
      title="Creer un compte"
      subtitle="Quelques secondes suffisent."
      footer={
        <>
          Deja inscrit ?{" "}
          <Link href="/connexion" className="font-medium text-ink-900 underline underline-offset-4">
            Se connecter
          </Link>
        </>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1">
        {(
          [
            { value: "client", label: "Je veux louer", icon: User },
            { value: "pro", label: "Je suis loueur", icon: Building2 },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRole(option.value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              role === option.value
                ? "bg-surface text-ink-900 shadow-soft"
                : "text-ink-500 hover:text-ink-800",
            )}
          >
            <option.icon className="size-4" />
            {option.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Nom complet" required error={errors.fullName} htmlFor="fullName">
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </Field>

        {role === "pro" ? (
          <Field
            label="Nom de l'agence"
            required
            error={errors.companyName}
            htmlFor="companyName"
            hint="C'est le nom qui apparaitra sur la carte."
          >
            <Input id="companyName" name="companyName" autoComplete="organization" />
          </Field>
        ) : null}

        <Field label="E-mail" required error={errors.email} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field label="Telephone" error={errors.phone} htmlFor="phone">
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </Field>

        <Field
          label="Mot de passe"
          required
          error={errors.password}
          htmlFor="password"
          hint="8 caracteres minimum, avec majuscule, minuscule et chiffre."
        >
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : null}
          {role === "pro" ? "Creer mon compte pro" : "Creer mon compte"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          En creant un compte, vous acceptez nos conditions d&apos;utilisation et notre politique de
          confidentialite.
        </p>
      </form>
    </AuthLayout>
  );
}
