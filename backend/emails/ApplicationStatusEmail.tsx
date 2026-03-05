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

export interface ApplicationStatusEmailProps {
  applicantName: string;
  orgName: string;
  status: "APPROVED" | "REJECTED";
  reviewNotes?: string;
  portalUrl?: string;
}

export function ApplicationStatusEmail({
  applicantName,
  orgName,
  status,
  reviewNotes,
  portalUrl,
}: ApplicationStatusEmailProps) {
  const isApproved = status === "APPROVED";
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
        {isApproved
          ? `🎉 ${orgName} is approved and live on GiveStream!`
          : `An update on your GiveStream application for ${orgName}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>GiveStream</Text>
          </Section>

          {/* Status hero */}
          {isApproved ? (
            <Section style={approvedHero}>
              <Text style={heroEmoji}>🎉</Text>
              <Text style={heroStatusLabel}>Application Approved</Text>
              <Heading style={heroHeadlineApproved}>
                Welcome to GiveStream, {firstName}!
              </Heading>
              <Text style={heroSubtextApproved}>
                <strong>{orgName}</strong> is now live and discoverable by
                thousands of donors.
              </Text>
            </Section>
          ) : (
            <Section style={rejectedHero}>
              <Text style={heroEmoji}>📋</Text>
              <Text style={heroStatusLabelRejected}>Application Update</Text>
              <Heading style={heroHeadlineRejected}>
                Hi {firstName}, we have an update for you
              </Heading>
              <Text style={heroSubtextRejected}>
                Regarding your application for{" "}
                <strong>{orgName}</strong>
              </Text>
            </Section>
          )}

          <Hr style={divider} />

          {/* Body content */}
          <Section style={content}>
            {isApproved ? (
              <>
                <Text style={bodyText}>
                  We&apos;ve verified your organization and everything checks
                  out. Donors across the GiveStream platform can now discover{" "}
                  <strong>{orgName}</strong> and support your mission.
                </Text>

                {/* What's next steps */}
                <Text style={stepsTitle}>Here&apos;s what to do next:</Text>
                <table style={stepsTable}>
                  <tbody>
                    <StepRow
                      number="1"
                      title="Set up your profile"
                      description="Add your mission, photos, and story to attract donors."
                    />
                    <StepRow
                      number="2"
                      title="Create a campaign"
                      description="Launch a fundraising campaign with a specific goal."
                    />
                    <StepRow
                      number="3"
                      title="Share with your community"
                      description="Invite supporters to follow and donate on GiveStream."
                    />
                  </tbody>
                </table>
              </>
            ) : (
              <>
                <Text style={bodyText}>
                  Thank you for taking the time to apply to list{" "}
                  <strong>{orgName}</strong> on GiveStream. After careful review
                  by our team, we&apos;re unable to approve your application at
                  this time.
                </Text>
                <Text style={bodyText}>
                  We understand this is disappointing. Please review the
                  feedback below — many organizations are approved after
                  addressing the noted issues and reapplying.
                </Text>
              </>
            )}

            {/* Review notes */}
            {reviewNotes && (
              <Section style={notesBox}>
                <Text style={notesLabel}>
                  {isApproved ? "Reviewer Note" : "Reason for Decision"}
                </Text>
                <Text style={notesText}>&ldquo;{reviewNotes}&rdquo;</Text>
              </Section>
            )}
          </Section>

          <Hr style={divider} />

          {/* CTA */}
          <Section style={ctaSection}>
            {isApproved && portalUrl ? (
              <>
                <Button href={portalUrl} style={buttonApproved}>
                  Go to Your Portal →
                </Button>
                <Text style={ctaNote}>
                  Your portal is where you manage donations, campaigns, and your
                  team.
                </Text>
              </>
            ) : (
              !isApproved && (
                <>
                  <Button href={`${APP_URL}/apply`} style={buttonNeutral}>
                    Reapply Now
                  </Button>
                  <Text style={ctaNote}>
                    Have questions?{" "}
                    <a href="mailto:support@givestream.org" style={link}>
                      Contact our support team
                    </a>{" "}
                    — we&apos;re happy to help.
                  </Text>
                </>
              )
            )}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} GiveStream, Inc. &middot;{" "}
              <a href={`${APP_URL}`} style={footerLink}>
                givestream.org
              </a>{" "}
              &middot;{" "}
              <a href="mailto:support@givestream.org" style={footerLink}>
                support@givestream.org
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function StepRow({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <tr>
      <td style={stepNumberCell}>
        <Text style={stepNumber}>{number}</Text>
      </td>
      <td style={stepContentCell}>
        <Text style={stepTitle}>{title}</Text>
        <Text style={stepDescription}>{description}</Text>
      </td>
    </tr>
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

const approvedHero: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  padding: "40px 32px 36px",
  textAlign: "center",
  borderBottom: "1px solid #bbf7d0",
};

const rejectedHero: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  padding: "40px 32px 36px",
  textAlign: "center",
  borderBottom: "1px solid #e5e7eb",
};

const heroEmoji: React.CSSProperties = {
  fontSize: "44px",
  lineHeight: "1",
  margin: "0 0 16px",
};

const heroStatusLabel: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#16a34a",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "4px 12px",
  borderRadius: "20px",
  margin: "0 0 16px",
};

const heroStatusLabelRejected: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#6b7280",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "4px 12px",
  borderRadius: "20px",
  margin: "0 0 16px",
};

const heroHeadlineApproved: React.CSSProperties = {
  color: "#14532d",
  fontSize: "26px",
  fontWeight: "700",
  letterSpacing: "-0.4px",
  margin: "0 0 10px",
};

const heroHeadlineRejected: React.CSSProperties = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: "700",
  letterSpacing: "-0.3px",
  margin: "0 0 10px",
};

const heroSubtextApproved: React.CSSProperties = {
  color: "#166534",
  fontSize: "15px",
  margin: "0",
};

const heroSubtextRejected: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "15px",
  margin: "0",
};

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "0",
};

const content: React.CSSProperties = {
  padding: "36px 32px 28px",
};

const bodyText: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: "0 0 16px",
};

const stepsTitle: React.CSSProperties = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "600",
  margin: "24px 0 16px",
};

const stepsTable: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: "0 8px",
};

const stepNumberCell: React.CSSProperties = {
  width: "36px",
  verticalAlign: "top",
  paddingTop: "2px",
};

const stepNumber: React.CSSProperties = {
  backgroundColor: "#7c3aed",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "700",
  width: "24px",
  height: "24px",
  lineHeight: "24px",
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
  margin: "0 0 2px",
};

const stepDescription: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "0",
};

const notesBox: React.CSSProperties = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
  borderLeft: "3px solid #f59e0b",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "20px 0 8px",
};

const notesLabel: React.CSSProperties = {
  color: "#92400e",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  margin: "0 0 8px",
};

const notesText: React.CSSProperties = {
  color: "#78350f",
  fontSize: "14px",
  lineHeight: "1.65",
  fontStyle: "italic",
  margin: "0",
};

const ctaSection: React.CSSProperties = {
  padding: "32px",
  textAlign: "center",
};

const buttonApproved: React.CSSProperties = {
  backgroundColor: "#16a34a",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  padding: "13px 28px",
  textDecoration: "none",
  letterSpacing: "0.01em",
};

const buttonNeutral: React.CSSProperties = {
  backgroundColor: "#7c3aed",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  padding: "13px 28px",
  textDecoration: "none",
  letterSpacing: "0.01em",
};

const ctaNote: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  marginTop: "16px",
  lineHeight: "1.5",
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
