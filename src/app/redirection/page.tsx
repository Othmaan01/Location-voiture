import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Aiguillage post-connexion : chaque role part vers son espace. */
export default async function RedirectPage() {
  const session = await getSession();
  if (!session) redirect("/connexion");

  const role = session.profile?.role;
  redirect(role === "pro" || role === "admin" ? "/dashboard" : "/compte");
}
