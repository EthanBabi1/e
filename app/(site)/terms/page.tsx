import { PolicyPage } from "@/components/legal/PolicyPage";
import { getPolicy } from "@/lib/legal/policyContent";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return <PolicyPage policy={getPolicy("terms")!} />;
}
