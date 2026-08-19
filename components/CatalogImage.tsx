"use client";

export default function CatalogImage({
  src,
  alt,
  className,
  fill,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
}) {
  if (!src) {
    return <div className={`${fill ? "absolute inset-0" : ""} bg-gray-900 ${className || ""}`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      fetchPriority={priority ? "high" : undefined}
      className={`${fill ? "absolute inset-0 h-full w-full object-cover" : "h-full w-full object-cover"} ${className || ""}`}
    />
  );
}
