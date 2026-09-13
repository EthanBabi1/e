import { PolicyPage } from "@/components/legal/PolicyPage";
import { getPolicy } from "@/lib/legal/policyContent";

export const metadata = { title: "How Ratings Work" };

export default function Page() {
  return <PolicyPage policy={getPolicy("rating")!} />;
}
