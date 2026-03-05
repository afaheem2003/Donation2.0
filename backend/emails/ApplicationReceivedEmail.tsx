import {
  Body,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://givestream.org";

export interface ApplicationReceivedEmailProps {
  applicantName: string;
  orgName: string;
  isClaim?: boolean;
}

export function ApplicationReceivedEmail({
  applicantName,
  orgName,
  isClaim = false,
}: ApplicationReceivedEmailProps) {
  const firstName = applicantName.split(" ")[0];

  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        We received your {isClaim ? "claim" : "application"} for {orgName} —
        we&apos;ll be in touch soon.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>GiveStream</Text>
          </Section>

          {/* Hero */}
          <Section style={hero}>
            <Text style={heroEmoji}>📬</Text>
            <Heading style={heroHeadline}>
              {isClaim ? "Claim received!" : "Application received!"}
            </Heading>
            <Text style={heroSubtext}>
              Hi {firstName}, we&apos;ve got your{" "}
              {isClaim ? "claim" : "application"} for{" "}
              <strong>{orgName}</strong> and our team will review it shortly.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* What happens next */}
          <Section style={content}>
            <Text style={sectionTitle}>What happens next</Text>
            <table style={stepsTable}>
              <tbody>
                <tr>
                  <td style={stepIconCell}>
                    <Text style={stepIcon}>1</Text>
                  </td>
                  <td style={stepContentCell}>
                    <Text style={stepTitle}>Review</Text>
                    <Text style={stepDesc}>
                      Our team verifies your organization&apos;s details,
                      including the EIN and 501(c)(3) status.
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={stepIconCell}>
                    <Text style={stepIcon}>2</Text>
                  </td>
                  <td style={stepContentCell}>
                    <Text style={stepTitle}>Decision</Text>
                    <Text style={stepDesc}>
                      You&apos;ll receive an email with our decision, typically
                      within 1–3 business days.
                    </Text>
                  </td>
                </tr>
                <tr>
                  <td style={stepIconCell}>
                    <Text style={stepIcon}>3</Text>
                  </td>
                  <td style={stepContentCell}>
                    <Text style={stepTitle}>Go live</Text>
                    <Text style={stepDesc}>
                      Once approved, you&apos;ll get access to your portal and
                      can start accepting donations immediately.
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={divider} />

          {/* Footer note */}
          <Section style={footerNote}>
            <Text style={footerNoteText}>
              Have questions? Reply to this email or reach us at{" "}
              <a href="mailto:support@givestream.org" style={link}>
                support@givestream.org
              </a>
              .
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} GiveStream, Inc. &middot;{" "}
              <a href={`${APP_URL}`} style={footerLink}>
                givestream.org
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const main: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  fontFamily:
    "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "32px auto",
  maxWidth: "560px",
  borderRadius: "16px",
  overflow: "hidden",
  border: "1px solid #e5e7eb",
};

const header: React.CSSProperties = {
  backgroundColor: "#7c3aed",
  padding: "18px 32px",
};

const logoText: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "700",
  letterSpacing: "-0.3px",
  margin: "0",
};

const hero: React.CSSProperties = {
  padding: "44px 32px 36px",
  textAlign: "center",
};

const heroEmoji: React.CSSProperties = {
  fontSize: "48px",
  lineHeight: "1",
  margin: "0 0 20px",
};

const heroHeadline: React.CSSProperties = {
  color: "#111827",
  fontSize: "28px",
  fontWeight: "800",
  letterSpacing: "-0.5px",
  margin: "0 0 14px",
};

const heroSubtext: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "15px",
  lineHeight: "1.65",
  margin: "0",
};

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "0",
};

const content: React.CSSProperties = {
  padding: "36px 32px 28px",
};

const sectionTitle: React.CSSProperties = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "600",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  margin: "0 0 20px",
};

const stepsTable: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: "0 12px",
};

const stepIconCell: React.CSSProperties = {
  width: "36px",
  verticalAlign: "top",
  paddingTop: "1px",
};

const stepIcon: React.CSSProperties = {
  backgroundColor: "#7c3aed",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "700",
  width: "26px",
  height: "26px",
  lineHeight: "26px",
  borderRadius: "50%",
  textAlign: "center",
  margin: "0",
};

const stepContentCell: React.CSSProperties = {
  verticalAlign: "top",
  paddingLeft: "4px",
};

const stepTitle: React.CSSProperties = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 3px",
};

const stepDesc: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: "0",
};

const footerNote: React.CSSProperties = {
  padding: "24px 32px",
  textAlign: "center",
};

const footerNoteText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
};

const link: React.CSSProperties = {
  color: "#7c3aed",
  textDecoration: "none",
};

const footer: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  borderTop: "1px solid #e5e7eb",
  padding: "20px 32px",
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "0",
};

const footerLink: React.CSSProperties = {
  color: "#7c3aed",
  textDecoration: "none",
};
