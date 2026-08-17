import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Backoffice",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[#070708] text-[#f4f4f5]">{children}</div>;
}
