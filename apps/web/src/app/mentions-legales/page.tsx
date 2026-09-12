import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";
import { PHOTO_CREDITS } from "@/lib/showcase";

export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false, follow: true },
};

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Mentions legales"
      intro="Informations légales de l'éditeur du site et de l'application KARSON."
      sections={[
        {
          heading: "Crédits photos",
          body: `Photos de véhicules utilisées à titre d'illustration, issues de Wikimedia Commons sous licence libre avec attribution :\n${PHOTO_CREDITS.map((c) => `${c.title} — ${c.artist} — ${c.license} — ${c.page}`).join("\n")}`,
        },
        {
          heading: "Éditeur du site",
          body: "[Dénomination sociale] — [forme juridique] au capital de [montant] €\nSiège social : [adresse]\nRCS [ville] [numéro] — SIRET [numéro]\nTVA intracommunautaire : [numéro]\nDirecteur de la publication : [nom]\nContact : [e-mail]",
        },
        {
          heading: "Hébergement",
          body: "Le site est hébergé par Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis.\nLa base de données est hébergée par Supabase (région européenne, Francfort Supabase).",
        },
        {
          heading: "Rôle de la plateforme",
          body: "KARSON est un annuaire et un service de mise en relation. La plateforme n'est ni loueur, ni intermédiaire commercial dans les contrats de location. Chaque contrat est conclu directement entre le particulier et l'agence. Les informations publiees (prix, disponibilites, conditions) relevent de la responsabilite de l'agence qui les publie.",
        },
        {
          heading: "Propriété intellectuelle",
          body: "Les contenus publiés par les agences (textes, photographies, logos) restent leur propriété. Toute reproduction du site ou de sa base de données sans autorisation est interdite.",
        },
      ]}
    />
  );
}
