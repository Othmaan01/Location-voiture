import type { AuthError } from "@supabase/supabase-js";

/** Messages utilisateur pour les erreurs Supabase Auth ; jamais le message brut. */
export function describeAuthError(error: AuthError | null | undefined): string {
  if (!error) return "Une erreur est survenue. Réessayez.";
  switch (error.code) {
    case "invalid_credentials":
      return "E-mail ou mot de passe incorrect.";
    case "email_not_confirmed":
      return "Confirmez d'abord votre adresse e-mail.";
    case "user_already_exists":
    case "email_exists":
      return "Un compte existe déjà avec cette adresse.";
    case "weak_password":
      return "Mot de passe trop faible : 10 caractères minimum, évitez les mots de passe connus.";
    case "otp_expired":
      return "Ce code a expiré. Demandez-en un nouveau.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Trop de tentatives. Patientez une minute.";
    case "same_password":
      return "Choisissez un mot de passe différent de l'ancien.";
    default:
      if (error.status === 400 && /token/i.test(error.message)) return "Code invalide ou expiré.";
      return "Une erreur est survenue. Réessayez.";
  }
}
