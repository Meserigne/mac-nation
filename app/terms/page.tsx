import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "Conditions générales" };

export default function TermsPage() {
  return (
    <main>
      <PageHero title="Conditions générales" />
      <article className="mx-auto max-w-[720px] space-y-5 px-6 pb-28 text-sm leading-relaxed text-gray-400">
        <p>
          Les prestations, tarifs et abonnements présentés s&apos;appliquent au salon MAC NATION de Nord Foire,
          Dakar. Ils peuvent évoluer. La réservation se confirme au salon ou par message.
        </p>
        <p>
          Les visites d&apos;abonnement non utilisées ne se reportent pas au mois suivant, sauf accord de
          l&apos;équipe.
        </p>
      </article>
    </main>
  );
}
