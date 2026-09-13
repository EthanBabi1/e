import { PolicyPage } from "@/components/legal/PolicyPage";
import { getPolicy } from "@/lib/legal/policyContent";

export const metadata = { title: "Sponsorship Terms" };

export default function Page() {
  return <PolicyPage policy={getPolicy("sponsorship-terms")!} />;
}
