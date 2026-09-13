import { PolicyPage } from "@/components/legal/PolicyPage";
import { getPolicy } from "@/lib/legal/policyContent";

export const metadata = { title: "For Parents & Guardians" };

export default function Page() {
  return <PolicyPage policy={getPolicy("for-parents")!} />;
}
