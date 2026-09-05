"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { fieldErrors, signInSchema } from "@/lib/validators";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("suivant") ?? "/redirection";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Supabase n'est pas configure. Renseignez .env.local (voir .env.example).");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const parsed = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);

    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "E-mail ou mot de passe incorrect."
          : error.message,
      );
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accedez a votre espace RentMap."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-ink-900 underline underline-offset-4">
            Creer un compte
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="E-mail" required error={errors.email} htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>

        <Field label="Mot de passe" required error={errors.password} htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : null}
          Se connecter
        </Button>
      </form>
    </AuthLayout>
  );
}
