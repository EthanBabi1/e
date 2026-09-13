import { Button, Heading, Text } from "@react-email/components";
import { EmailShell } from "./base";
import { CONFIG } from "@/lib/config";

/**
 * Financial category — section 10: "Never send a minor an email about
 * money. All financial notifications route to the guardian." This
 * template's copy addresses whoever the recipient actually is (guardian
 * or the racer themself); lib/notifications/dispatch.ts is what
 * guarantees a minor never ends up as that recipient in the first place.
 */
export function SponsorshipSoldEmail({ racerName, zoneName, amountUsd, recipientIsGuardian }: { racerName: string; zoneName: string; amountUsd: number; recipientIsGuardian: boolean }) {
  return (
    <EmailShell preview={`A sponsorship sold — ${zoneName}`}>
      <Heading style={{ fontSize: 22 }}>A sponsorship sold</Heading>
      <Text>
        {recipientIsGuardian ? `${racerName}'s` : "Your"} {zoneName} zone sold for ${amountUsd}. Funds release once the decal photo is confirmed.
      </Text>
      <Button href={`https://${CONFIG.domain}/dashboard`} style={{ background: "#0A0A0B", color: "#FAFAF8", padding: "12px 24px", borderRadius: 999 }}>
        View in dashboard
      </Button>
    </EmailShell>
  );
}

export const SponsorshipSoldEmailPreview = <SponsorshipSoldEmail racerName="Jordan Vance" zoneName="Nose Cone" amountUsd={220} recipientIsGuardian={false} />;
