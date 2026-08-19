import Hero from "@/components/home/Hero";
import News from "@/components/home/News";
import BrandExperience from "@/components/home/BrandExperience";
import AllBlackSalon from "@/components/home/AllBlackSalon";
import Reviews from "@/components/home/Reviews";
import OfferStrip from "@/components/home/OfferStrip";
import JoinCTA from "@/components/home/JoinCTA";
import { photoOf } from "@/lib/site-photos";
import { getPublicCatalog } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getPublicCatalog();
  const photos = catalog.photos;

  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <Hero image={photoOf(photos, "hero")} />
      <News />
      <BrandExperience reception={photoOf(photos, "reception")} team={photoOf(photos, "receptionTeam")} />
      <AllBlackSalon photos={photos} />
      <Reviews image={photoOf(photos, "reviews")} />
      <OfferStrip boutique={photoOf(photos, "boutiquePeople")} waiting={photoOf(photos, "waiting")} />
      <JoinCTA image={photoOf(photos, "waiting")} />
    </main>
  );
}
