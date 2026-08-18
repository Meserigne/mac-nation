"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { List, X } from "@phosphor-icons/react";
import { navLinks } from "@/lib/assets";
import AccountNav from "@/components/AccountNav";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="fixed top-5 z-50 w-full px-4 sm:px-8 lg:left-1/2 lg:w-auto lg:-translate-x-1/2 lg:px-0">
      <div className="pointer-events-none fixed top-0 left-0 h-30 w-full bg-background/80 backdrop-blur-3xl mask-from-b" />
      <nav
        aria-label="Main"
        className="relative mx-auto flex h-full flex-col rounded-[19px] shadow-xl shadow-black/30 stroke-gradient [--stroke-opacity:0.2] [--stroke-width:1.5px] [--stroke-angle:10deg] lg:flex-row"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-[19px] bg-gray-950/30 backdrop-blur-2xl"
        />
        <ul className="flex w-full list-none items-center justify-between gap-3 p-4 sm:gap-5">
          <li className="relative w-12 px-3 lg:w-15">
            <Link href="/" aria-label="Go to home">
              <Image src="/logo-square.svg" alt="MAC NATION" width={30} height={30} />
            </Link>
          </li>
          <ul
            className={`hidden flex-2 items-center gap-4 px-8 lg:flex ${
              ready ? "opacity-100 scale-y-100" : "opacity-0 scale-y-[0.96]"
            } origin-center transition-all duration-500`}
          >
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href} className="relative flex h-full items-center justify-center">
                  <Link
                    href={link.href}
                    className={`whitespace-nowrap p-3 text-sm tracking-wide transition-all duration-300 hover:scale-[1.03] hover:text-gray-200 ${
                      active ? "text-gray-200" : "text-gray-300/50"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <li className="relative hidden sm:block">
            <AccountNav className="whitespace-nowrap p-3 text-sm tracking-wide text-gray-300/50 transition-all duration-300 hover:scale-[1.03] hover:text-gray-200" />
          </li>
          <li className="relative">
            <Link
              href="/rendez-vous"
              className="btn-gold inline-flex h-10 cursor-pointer items-center justify-center rounded-lg px-5 text-[14px] font-medium transition-all duration-300 active:scale-[0.98] sm:px-8"
            >
              Réserver
            </Link>
          </li>
          <li className="relative flex items-center justify-center lg:hidden">
            <button
              type="button"
              aria-label={open ? "Fermer le menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gray-950/90 text-white transition-all duration-300"
            >
              {open ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
            </button>
          </li>
        </ul>
        {open ? (
          <ul className="flex flex-col gap-1 px-6 pb-6 lg:hidden">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-lg px-3 py-3 text-sm text-gray-200 transition-colors hover:bg-white/5"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <AccountNav className="block rounded-lg px-3 py-3 text-sm text-gray-200 transition-colors hover:bg-white/5" />
            </li>
          </ul>
        ) : null}
      </nav>
    </header>
  );
}
