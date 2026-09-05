import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "A propos",
  description:
    "RentMap referencie les loueurs de voitures ville par ville et met les particuliers en relation directe avec les agences, sans commission.",
};

export default function AboutPage() {
  return (
    <LegalPage
      title="A propos de RentMap"
      intro="Rendre visible chaque loueur de voitures, partout en France."
      sections={[
        {
          heading: "Le constat",
          body: "Des milliers d'agences de location de voitures independantes existent en France. La plupart n'apparaissent nulle part quand un particulier cherche « location voiture » dans sa ville : les premieres places sont occupees par quelques grands reseaux et par des comparateurs qui prennent une commission sur chaque reservation.",
        },
        {
          heading: "Notre reponse",
          body: "Une carte unique, ville par ville, ou chaque loueur professionnel peut publier son agence, sa flotte, ses prix et ses conditions. Le particulier compare, puis contacte l'agence directement. Le contrat de location se conclut entre eux deux, sans nous.",
        },
        {
          heading: "Notre modele economique",
          body: "Nous ne prenons aucune commission sur les locations. Notre unique revenu est l'abonnement mensuel des professionnels referencés. Cela garantit que nos interets restent alignes avec les leurs : notre travail est de leur apporter des demandes, pas de prelever un pourcentage.",
        },
        {
          heading: "Ce projet est en construction",
          body: "RentMap est en cours de developpement. Les fonctionnalites evoluent rapidement : si vous etes loueur et souhaitez participer aux premiers retours, contactez-nous.",
        },
      ]}
    />
  );
}
