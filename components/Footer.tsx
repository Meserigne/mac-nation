import Image from "next/image";
import Link from "next/link";
import { salonInfo } from "@/lib/assets";

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
          <p className="text-gray-400">Copyright © 2026 MAC NATION Dakar</p>
          <div className="flex-1" />
          <nav className="flex items-center gap-10">
            <Link className="text-sm text-gray-400 hover:text-white" href="/rendez-vous">
              Payer un RDV
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/boutique">
              Boutique
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/abonnements">
              Abonnements
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/contact">
              Contact
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/career">
              Carrières
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/privacy">
              Politique de confidentialité
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/terms">
              Conditions générales
            </Link>
          </nav>
        </div>
        <div className="mt-8 flex flex-col gap-8 pb-8 text-xs lg:hidden">
          <p className="text-center text-gray-400">Copyright © 2026 MAC NATION Dakar</p>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link className="text-sm text-gray-400 hover:text-white" href="/rendez-vous">
              Payer un RDV
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/boutique">
              Boutique
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/abonnements">
              Abonnements
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/contact">
              Contact
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/career">
              Carrières
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/privacy">
              Politique de confidentialité
            </Link>
            <Link className="text-sm text-gray-400 hover:text-white" href="/terms">
              Conditions générales
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
