import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <main>
      <PageHero title="Politique de confidentialité" />
      <article className="mx-auto max-w-[720px] space-y-5 px-6 pb-28 text-sm leading-relaxed text-gray-400">
        <p>
          MAC NATION traite les informations que vous nous confiez pour répondre à une réservation, une commande
          boutique, un abonnement ou une candidature.
        </p>
        <p>
          Le formulaire de ce site est une démonstration locale : les messages ne sont pas envoyés vers un serveur
          tant que le canal officiel n&apos;est pas branché.
        </p>
      </article>
    </main>
  );
}
