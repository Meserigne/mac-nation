import Image from "next/image";
import Link from "next/link";
import { salonInfo } from "@/lib/assets";

const SALON_LINKS = [
  { href: "/rendez-vous", label: "Réserver" },
  { href: "/boutique", label: "Boutique" },
  { href: "/abonnements", label: "Abonnements" },
  { href: "/contact", label: "Contact" },
  { href: "/career", label: "Carrières" },
] as const;

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/privacy", label: "Politique de confidentialité" },
  { href: "/retours", label: "Retours & remboursements" },
  { href: "/envois", label: "Politique d'envois" },
  { href: "/cgv", label: "CGV" },
  { href: "/cgu", label: "CGU" },
] as const;

function LegalNav() {
  return (
    <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xs text-gray-500">
      {LEGAL_LINKS.map((item, index) => (
        <span key={item.href} className="inline-flex items-center gap-2">
          {index > 0 ? <span aria-hidden>·</span> : null}
          <Link className="hover:text-white" href={item.href}>
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

export default function Footer() {
  return (
    <footer id="mainFooter" className="w-full bg-gray-950 text-foreground">
      <div className="mx-auto w-full max-w-[120rem] px-6 md:px-10 lg:px-16 xl:px-20">
        <div className="flex flex-col flex-wrap items-center justify-between gap-12 p-4 pt-10 sm:flex-row lg:flex-nowrap lg:gap-8 lg:p-0 lg:pt-14">
          <Link href="/" aria-label="MAC NATION accueil" className="flex items-center gap-3">
            <Image src="/logo-square.svg" alt="" width={36} height={36} />
            <span className="font-bebas text-3xl tracking-wide text-white">MAC NATION</span>
          </Link>
          <div className="text-center sm:text-left">
            <p className="text-[18px] font-semibold">Le salon</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-400">
              {salonInfo.address}
              <br />
              {salonInfo.city}, {salonInfo.country}
            </p>
            <p className="mt-2 text-sm text-gray-500">{salonInfo.hours}</p>
          </div>
        </div>
        <div className="flex w-full items-center justify-center py-4 lg:py-8">
          <div className="gold-line h-px w-full" />
        </div>
        <div className="hidden items-center gap-6 py-6 text-xs lg:flex">
          <nav className="flex items-center gap-10">
            {SALON_LINKS.map((item) => (
              <Link key={item.href} className="text-sm text-gray-400 hover:text-white" href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-2 flex flex-col gap-8 pb-4 text-xs lg:hidden">
          <nav className="flex flex-wrap items-center justify-center gap-6">
            {SALON_LINKS.map((item) => (
              <Link key={item.href} className="text-sm text-gray-400 hover:text-white" href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col items-center gap-3 border-t border-white/10 py-8 text-center">
          <LegalNav />
          <p className="text-xs text-gray-600">Tous droits réservés © 2026 MAC NATION</p>
        </div>
      </div>
    </footer>
  );
}
