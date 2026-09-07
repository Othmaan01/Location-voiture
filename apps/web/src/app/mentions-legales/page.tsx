import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";
import { PHOTO_CREDITS } from "@/lib/showcase";

export const metadata: Metadata = {
  title: "Mentions legales",
  robots: { index: false, follow: true },
};

export default function LegalNoticePage() {
  return (
    <LegalPage
      title="Mentions legales"
      intro="Modele a completer avec vos informations reelles avant la mise en production."
      sections={[
        {
          heading: "Crédits photos",
          body: `Photos de véhicules utilisées à titre d'illustration, issues de Wikimedia Commons sous licence libre avec attribution :\n${PHOTO_CREDITS.map((c) => `${c.title} — ${c.artist} — ${c.license} — ${c.page}`).join("\n")}`,
        },
        {
          heading: "Editeur du site",
          body: "[Denomination sociale] — [forme juridique] au capital de [montant] €\nSiege social : [adresse]\nRCS [ville] [numero] — SIRET [numero]\nTVA intracommunautaire : [numero]\nDirecteur de la publication : [nom]\nContact : [e-mail]",
        },
        {
          heading: "Hebergement",
          body: "Le site est heberge par Netlify, Inc. — 512 2nd Street, Suite 200, San Francisco, CA 94107, Etats-Unis.\nLa base de donnees est hebergee par Supabase (region europeenne a selectionner dans le tableau de bord Supabase).",
        },
        {
          heading: "Role de la plateforme",
          body: "RentMap est un annuaire et un service de mise en relation. La plateforme n'est ni loueur, ni intermediaire commercial dans les contrats de location. Chaque contrat est conclu directement entre le particulier et l'agence. Les informations publiees (prix, disponibilites, conditions) relevent de la responsabilite de l'agence qui les publie.",
        },
        {
          heading: "Propriete intellectuelle",
          body: "Les contenus publies par les agences (textes, photographies, logos) restent leur propriete. Toute reproduction du site ou de sa base de donnees sans autorisation est interdite.",
        },
      ]}
    />
  );
}
