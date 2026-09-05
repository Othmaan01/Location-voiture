/**
 * Etat partage par toutes les Server Actions utilisees avec `useActionState`.
 *
 * Ce module est volontairement separe des fichiers "use server" :
 * un module "use server" ne peut exporter que des fonctions asynchrones,
 * donc ni type ni constante.
 */
export interface ActionState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Record<string, string>;
}

export const initialActionState: ActionState = { status: "idle" };
