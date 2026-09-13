import { SiteHeader } from "@/components/layout/SiteHeader";
import { LenisProvider } from "@/components/motion/LenisProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <LenisProvider>
      <SiteHeader />
      {children}
    </LenisProvider>
  );
}
