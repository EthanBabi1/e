import { Button, Heading, Text } from "@react-email/components";
import { EmailShell } from "./base";
import { CONFIG } from "@/lib/config";

export function NewMessageEmail({ racerName, threadUrl }: { racerName: string; threadUrl: string }) {
  return (
    <EmailShell preview={`New message about ${racerName}`}>
      <Heading style={{ fontSize: 22 }}>New message</Heading>
      <Text>You have a new message about {racerName}&apos;s profile.</Text>
      <Button href={threadUrl} style={{ background: "#0A0A0B", color: "#FAFAF8", padding: "12px 24px", borderRadius: 999 }}>
        View message
      </Button>
    </EmailShell>
  );
}

// Fixture used by /dev/emails and by anywhere sending this template.
export const NewMessageEmailPreview = <NewMessageEmail racerName="Jordan Vance" threadUrl={`https://${CONFIG.domain}/dashboard/messages/example`} />;
