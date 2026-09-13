import { Heading, Text } from "@react-email/components";
import { EmailShell } from "./base";

/** Section 7: "an automated monthly digest of how their racers performed
 * — the digest is the renewal engine." */
export function SponsorDigestEmail({ racerSummaries }: { racerSummaries: { name: string; summary: string }[] }) {
  return (
    <EmailShell preview="Your sponsored racers this month">
      <Heading style={{ fontSize: 20 }}>How your sponsored racers did this month</Heading>
      {racerSummaries.map((r) => (
        <Text key={r.name}>
          <strong>{r.name}</strong>: {r.summary}
        </Text>
      ))}
    </EmailShell>
  );
}
