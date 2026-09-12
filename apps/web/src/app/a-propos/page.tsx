import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "KARSON referencie les agences de location ville par ville et met les particuliers en relation directe avec les agences, sans commission.",
};

export default function AboutPage() {
  return (
    <LegalPage
      title="A propos de KARSON"
      intro="Rendre visible chaque agence de location de voitures, partout en France."
      sections={[
        {
          heading: "Le constat",
          body: "Des milliers d'agences de location de voitures indépendantes existent en France. La plupart n'apparaissent nulle part quand un particulier cherche « location voiture » dans sa ville : les premières places sont occupees par quelques grands reseaux et par des comparateurs qui prennent une commission sur chaque reservation.",
        },
        {
          heading: "Notre réponse",
          body: "Une carte unique, ville par ville, où chaque agence professionnelle peut publier son adresse, sa flotte, ses prix et ses conditions. Le particulier compare, puis contacte l'agence directement. Le contrat de location se conclut entre eux deux, sans nous.",
        },
        {
          heading: "Notre modèle économique",
          body: "Nous ne prenons aucune commission sur les locations. Notre unique revenu est l'abonnement mensuel des professionnels référencés. Cela garantit que nos intérêts restent alignés avec les leurs : notre travail est de leur apporter des demandes, pas de prelever un pourcentage.",
        },
        {
          heading: "Ce projet est en construction",
          body: "KARSON est en cours de développement. Les fonctionnalités évoluent rapidement : si vous êtes une agence et souhaitez participer aux premiers retours, écrivez-nous à sav@karson.fr.",
        },
      ]}
    />
  );
}
