import { Heading, Text } from "@react-email/components";
import { EmailShell } from "./base";

export function TrackRevenueDigestEmail({ trackName, gmvUsd, trackShareUsd }: { trackName: string; gmvUsd: number; trackShareUsd: number }) {
  return (
    <EmailShell preview={`${trackName}'s monthly revenue summary`}>
      <Heading style={{ fontSize: 20 }}>{trackName}: monthly revenue summary</Heading>
      <Text>Sponsorship GMV from your racers: ${gmvUsd.toFixed(0)}</Text>
      <Text>Your revenue share this period: ${trackShareUsd.toFixed(0)}</Text>
    </EmailShell>
  );
}
