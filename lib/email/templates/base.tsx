import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import { CONFIG } from "@/lib/config";

export function EmailShell({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#FAFAF8", fontFamily: "Georgia, serif", padding: "40px 0" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: 16, maxWidth: 480 }}>
          <Text style={{ fontSize: 12, letterSpacing: 2, color: "#B8B5AE", textTransform: "uppercase" }}>{CONFIG.platformName}</Text>
          {children}
          <Section style={{ marginTop: 32, borderTop: "1px solid #E6E4DF", paddingTop: 16 }}>
            <Text style={{ fontSize: 11, color: "#B8B5AE" }}>
              You&apos;re receiving this because of activity on your {CONFIG.platformName} account. Manage your notification preferences from your
              dashboard.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
