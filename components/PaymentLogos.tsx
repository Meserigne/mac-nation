export const MONEY_METHODS = [
  { id: "wave" as const, src: "/pay/wave.png", alt: "Wave", label: "Wave" },
  { id: "orange" as const, src: "/pay/maxit.png", alt: "Max it", label: "Max it" },
  { id: "free" as const, src: "/pay/mixx.png", alt: "Mixx by Free", label: "Mixx" },
];

export function MoneyLogo({
  method,
  className,
}: {
  method: "wave" | "orange" | "free";
  className?: string;
}) {
  const item = MONEY_METHODS.find((row) => row.id === method);
  if (!item) return null;
  return (
    <span className={`block shrink-0 overflow-hidden rounded-xl ${className || "h-14 w-14"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.src}
        alt={item.alt}
        width={80}
        height={80}
        className={
          method === "wave"
            ? "h-full w-full scale-[1.35] object-cover object-left"
            : "h-full w-full object-cover"
        }
      />
    </span>
  );
}

export default function PaymentLogos({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-7 w-7" : "h-10 w-10 sm:h-11 sm:w-11";
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className || ""}`} aria-label="Wave, Max it, Mixx">
      {MONEY_METHODS.map((item) => (
        <MoneyLogo key={item.id} method={item.id} className={box} />
      ))}
    </div>
  );
}
