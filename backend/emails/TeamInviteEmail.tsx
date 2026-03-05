import {
  Body,
  Button,
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

export interface TeamInviteEmailProps {
  invitedByName: string;
  nonprofitName: string;
  role: "ADMIN" | "OWNER";
  acceptUrl: string;
  expiresAt: Date;
}

const ROLE_LABELS: Record<TeamInviteEmailProps["role"], string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
};

const ROLE_DESCRIPTIONS: Record<TeamInviteEmailProps["role"], string> = {
  OWNER:
    "Full control over the organization — manage team members, campaigns, and financial settings.",
  ADMIN:
    "Manage donations, create campaigns, post updates, and view organization analytics.",
};

const ROLE_COLORS: Record<TeamInviteEmailProps["role"], string> = {
  OWNER: "#7c3aed",
  ADMIN: "#2563eb",
};

function formatExpiry(expiresAt: Date): string {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) return "in less than 24 hours";
  if (diffDays <= 7) return `in ${diffDays} days`;

  return `on ${new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(expiresAt)}`;
}

export function TeamInviteEmail({
  invitedByName,
  nonprofitName,
  role,
  acceptUrl,
  expiresAt,
}: TeamInviteEmailProps) {
  const expiryText = formatExpiry(expiresAt);
  const roleLabel = ROLE_LABELS[role];
  const roleDescription = ROLE_DESCRIPTIONS[role];
  const roleColor = ROLE_COLORS[role];

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
        {invitedByName} invited you to manage {nonprofitName} on GiveStream as{" "}
        {role === "OWNER" ? "an" : "an"} {roleLabel}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td>
                    <Text style={logoText}>GiveStream</Text>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Text style={headerTag}>Team Invitation</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Hero */}
          <Section style={hero}>
            <Text style={waveEmoji}>👋</Text>
            <Heading style={heroHeadline}>You&apos;re invited!</Heading>
            <Text style={heroSubtext}>
              <strong>{invitedByName}</strong> invited you to join their team on
              GiveStream.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Org + Role card */}
          <Section style={cardSection}>
            <table style={orgCard}>
              <tbody>
                <tr>
                  <td style={orgCardContent}>
                    <Text style={orgCardOrgLabel}>Organization</Text>
                    <Text style={orgCardOrgName}>{nonprofitName}</Text>
                    <table style={{ borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td
                            style={{
                              ...rolePill,
                              backgroundColor: roleColor,
                            }}
                          >
                            <Text style={rolePillText}>{roleLabel}</Text>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Role description */}
          <Section style={roleSection}>
            <Text style={roleDescLabel}>Your permissions as {roleLabel}</Text>
            <Text style={roleDescText}>{roleDescription}</Text>
          </Section>

          <Hr style={divider} />

          {/* CTA */}
          <Section style={ctaSection}>
            <Button href={acceptUrl} style={button}>
              Accept Invitation
            </Button>
            <Text style={expiryNote}>
              This invitation expires <strong>{expiryText}</strong>.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Security note */}
          <Section style={securitySection}>
            <Text style={securityText}>
              🔒 For your security, only accept this invitation if you know{" "}
              {invitedByName}. If this was unexpected, you can safely ignore
              this email — the link will expire automatically.
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

const headerTag: React.CSSProperties = {
  color: "rgba(255,255,255,0.65)",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  margin: "0",
};

const hero: React.CSSProperties = {
  padding: "44px 32px 36px",
  textAlign: "center",
};

const waveEmoji: React.CSSProperties = {
  fontSize: "48px",
  lineHeight: "1",
  margin: "0 0 20px",
};

const heroHeadline: React.CSSProperties = {
  color: "#111827",
  fontSize: "30px",
  fontWeight: "800",
  letterSpacing: "-0.6px",
  margin: "0 0 12px",
};

const heroSubtext: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0",
};

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "0",
};

const cardSection: React.CSSProperties = {
  padding: "28px 32px 0",
};

const orgCard: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: "#faf5ff",
  border: "1px solid #e9d5ff",
  borderRadius: "12px",
  overflow: "hidden",
};

const orgCardContent: React.CSSProperties = {
  padding: "24px 28px",
};

const orgCardOrgLabel: React.CSSProperties = {
  color: "#7c3aed",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  margin: "0 0 6px",
};

const orgCardOrgName: React.CSSProperties = {
  color: "#1e1b4b",
  fontSize: "24px",
  fontWeight: "700",
  letterSpacing: "-0.4px",
  margin: "0 0 14px",
};

const rolePill: React.CSSProperties = {
  borderRadius: "20px",
  padding: "5px 14px",
  display: "inline-block",
};

const rolePillText: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "600",
  margin: "0",
  letterSpacing: "0.02em",
};

const roleSection: React.CSSProperties = {
  padding: "20px 32px 28px",
};

const roleDescLabel: React.CSSProperties = {
  color: "#374151",
  fontSize: "12px",
  fontWeight: "600",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  margin: "0 0 8px",
};

const roleDescText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.65",
  margin: "0",
};

const ctaSection: React.CSSProperties = {
  padding: "36px 32px",
  textAlign: "center",
};

const button: React.CSSProperties = {
  backgroundColor: "#7c3aed",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600",
  padding: "14px 36px",
  textDecoration: "none",
  letterSpacing: "0.01em",
};

const expiryNote: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  marginTop: "16px",
};

const securitySection: React.CSSProperties = {
  padding: "0 32px 28px",
};

const securityText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "1.65",
  margin: "0",
  textAlign: "center",
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
