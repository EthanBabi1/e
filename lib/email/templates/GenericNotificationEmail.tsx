import { Button, Heading, Text } from "@react-email/components";
import { EmailShell } from "./base";
import { CONFIG } from "@/lib/config";

/** Fallback template for any notification without a dedicated design —
 * every category still gets a real email, just not always a bespoke one. */
export function GenericNotificationEmail({ title, body, linkUrl }: { title: string; body?: string | null; linkUrl?: string | null }) {
  return (
    <EmailShell preview={title}>
      <Heading style={{ fontSize: 20 }}>{title}</Heading>
      {body && <Text>{body}</Text>}
      {linkUrl && (
        <Button href={linkUrl.startsWith("http") ? linkUrl : `https://${CONFIG.domain}${linkUrl}`} style={{ background: "#0A0A0B", color: "#FAFAF8", padding: "12px 24px", borderRadius: 999 }}>
          View
        </Button>
      )}
    </EmailShell>
  );
}
