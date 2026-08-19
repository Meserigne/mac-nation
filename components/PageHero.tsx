import CatalogImage from "@/components/CatalogImage";
import PaymentLogos from "@/components/PaymentLogos";
import Reveal from "@/components/Reveal";

export default function PageHero({
  kicker,
  title,
  subtitle,
  image,
  payments,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  image?: string;
  payments?: boolean;
}) {
  return (
    <header className="relative flex min-h-[48dvh] w-full flex-col items-center justify-end overflow-hidden px-6 pt-32 pb-12 text-center sm:min-h-[54dvh]">
      {image ? (
        <>
          <CatalogImage src={image} alt="" fill priority className="object-[50%_42%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-black/35" />
        </>
      ) : null}
      <div className="relative z-10 flex flex-col items-center">
        {payments ? (
          <div className="mb-5">
            <PaymentLogos />
          </div>
        ) : kicker ? (
          <span className="mb-5 rounded-[14px] border-[0.5px] border-[#c4a574]/40 px-4 py-2 text-sm font-medium text-white">
            {kicker}
          </span>
        ) : null}
        <Reveal>
          <h1 className="title1 max-w-4xl text-5xl sm:text-6xl md:text-7xl">{title}</h1>
        </Reveal>
        {subtitle ? (
          <Reveal delay={0.08}>
            <p className="mt-6 max-w-[60ch] text-sm leading-relaxed text-gray-300 md:text-base">{subtitle}</p>
          </Reveal>
        ) : null}
      </div>
    </header>
  );
}
