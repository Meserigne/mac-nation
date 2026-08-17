import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Preloader from "@/components/Preloader";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "MAC NATION | Barbershop et Boutique capillaire à Dakar",
    template: "%s | MAC NATION",
  },
  description:
    "MAC NATION, barbershop pour hommes à Dakar. Nord Foire, en face du service d'hygiène. Coupe, barbe, boutique capillaire et abonnements. Tous types de cheveux.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${manrope.variable} ${bebas.variable}`}>
      <body className="font-sans bg-background p-0 antialiased">
        <Preloader />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
