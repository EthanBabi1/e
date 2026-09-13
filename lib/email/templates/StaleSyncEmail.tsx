import { Button, Heading, Text } from "@react-email/components";
import { EmailShell } from "./base";
import { CONFIG } from "@/lib/config";

/** Section 3: "When a sync has failed for more than 7 days, email the
 * racer with the manual upload path so they aren't blocked." */
export function StaleSyncEmail({ racerName }: { racerName: string }) {
  return (
    <EmailShell preview="Your results sync has been stuck for a week">
      <Heading style={{ fontSize: 22 }}>Your MYLAPS sync hasn&apos;t updated in a week</Heading>
      <Text>
        We haven&apos;t been able to pull new results for {racerName} in over 7 days. This isn&apos;t necessarily a problem with your transponder,
        it can happen on our end too. In the meantime, you can add results with a photo of the results sheet or by typing them in.
      </Text>
      <Button href={`https://${CONFIG.domain}/dashboard/results/import`} style={{ background: "#0A0A0B", color: "#FAFAF8", padding: "12px 24px", borderRadius: 999 }}>
        Add results manually
      </Button>
    </EmailShell>
  );
}

export const StaleSyncEmailPreview = <StaleSyncEmail racerName="Jordan Vance" />;
