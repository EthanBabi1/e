import { Button, Heading, Text } from "@react-email/components";
import { EmailShell } from "./base";
import { CONFIG } from "@/lib/config";

export function ClaimInvitationEmail({ racerName, claimUrl }: { racerName: string; claimUrl: string }) {
  return (
    <EmailShell preview={`Claim ${racerName}'s profile`}>
      <Heading style={{ fontSize: 22 }}>Your profile is ready</Heading>
      <Text>
        We found {racerName}&apos;s verified race results and built a profile. Claim it to add your story, a photo, and start selling
        sponsorship.
      </Text>
      <Button href={claimUrl} style={{ background: "#0A0A0B", color: "#FAFAF8", padding: "12px 24px", borderRadius: 999 }}>
        Claim your profile
      </Button>
    </EmailShell>
  );
}

export const ClaimInvitationEmailPreview = <ClaimInvitationEmail racerName="Jordan Vance" claimUrl={`https://${CONFIG.domain}/claim/example-token`} />;
