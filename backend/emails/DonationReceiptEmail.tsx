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

export interface DonationReceiptEmailProps {
  donorName: string;
  nonprofitName: string;
  nonprofitEin: string;
  amountCents: number;
  donatedAt: Date;
  receiptNumber: string;
  taxYear: number;
}

const formatAmount = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

export function DonationReceiptEmail({
  donorName,
  nonprofitName,
  nonprofitEin,
  amountCents,
  donatedAt,
  receiptNumber,
  taxYear,
}: DonationReceiptEmailProps) {
  const amount = formatAmount(amountCents);
  const date = formatDate(donatedAt);
  const firstName = donorName.split(" ")[0];

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
        ✓ {amount} donation to {nonprofitName} confirmed — Receipt{" "}
        {receiptNumber}
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
                    <Text style={receiptTag}>DONATION RECEIPT</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Amount hero */}
          <Section style={amountHero}>
            <Text style={checkCircle}>✓</Text>
            <Text style={heroGreeting}>Hi {firstName},</Text>
            <Text style={heroMessage}>Your donation was received!</Text>
            <Text style={amountDisplay}>{amount}</Text>
            <Text style={nonprofitLine}>
              donated to <strong>{nonprofitName}</strong>
            </Text>
            <Text style={dateLine}>{date}</Text>
          </Section>

          {/* Receipt card */}
          <Section style={receiptCardSection}>
            <table style={receiptCard}>
              <tbody>
                <tr>
                  <td colSpan={2} style={receiptCardHeader}>
                    <Text style={receiptCardTitle}>Receipt Details</Text>
                    <Text style={receiptNumberLabel}>#{receiptNumber}</Text>
                  </td>
                </tr>
                <ReceiptRow label="Donor" value={donorName} first />
                <ReceiptRow label="Organization" value={nonprofitName} />
                <ReceiptRow label="EIN" value={nonprofitEin} />
                <ReceiptRow label="Amount" value={amount} highlight />
                <ReceiptRow label="Date" value={date} />
                <ReceiptRow label="Tax Year" value={String(taxYear)} last />
              </tbody>
            </table>
          </Section>

          {/* Impact message */}
          <Section style={impactSection}>
            <Text style={impactIcon}>💚</Text>
            <Text style={impactText}>
              100% of your donation goes directly to {nonprofitName}. GiveStream
              never takes a cut from donations.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* CTA */}
          <Section style={ctaSection}>
            <Text style={ctaHeadline}>Keep track of all your giving</Text>
            <Text style={ctaSubtext}>
              View your complete donation history and download tax reports from
              your GiveStream account.
            </Text>
            <Button href={`${APP_URL}/tax`} style={button}>
              View Donation History
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Tax disclaimer */}
          <Section style={disclaimerSection}>
            <Text style={disclaimerTitle}>Tax Deductibility</Text>
            <Text style={disclaimerText}>
              {nonprofitName} (EIN: {nonprofitEin}) is a registered 501(c)(3)
              charitable organization. No goods or services were provided in
              exchange for this contribution. GiveStream is a technology
              platform. Please retain this receipt for your {taxYear} tax
              records.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {taxYear} GiveStream, Inc. &middot;{" "}
              <a href={`${APP_URL}`} style={footerLink}>
                givestream.org
              </a>{" "}
              &middot;{" "}
              <a href={`mailto:support@givestream.org`} style={footerLink}>
                support@givestream.org
              </a>
            </Text>
            <Text style={footerMuted}>
              You received this email because you made a donation through
              GiveStream.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function ReceiptRow({
  label,
  value,
  first,
  last,
  highlight,
}: {
  label: string;
  value: string;
  first?: boolean;
  last?: boolean;
  highlight?: boolean;
}) {
  const rowStyle: React.CSSProperties = {
    borderBottom: last ? "none" : "1px solid #f3f4f6",
  };
  const tdBase: React.CSSProperties = {
    padding: first ? "16px 20px 12px" : last ? "12px 20px 16px" : "12px 20px",
    verticalAlign: "middle",
  };
  return (
    <tr style={rowStyle}>
      <td style={{ ...tdBase, ...receiptRowLabel }}>{label}</td>
      <td
        style={{
          ...tdBase,
          ...receiptRowValue,
          ...(highlight ? receiptRowHighlight : {}),
        }}
      >
        {value}
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

const receiptTag: React.CSSProperties = {
  color: "rgba(255,255,255,0.65)",
  fontSize: "10px",
  fontWeight: "600",
  letterSpacing: "0.1em",
  margin: "0",
};

const amountHero: React.CSSProperties = {
  backgroundColor: "#fafafa",
  padding: "40px 32px 36px",
  textAlign: "center",
  borderBottom: "1px solid #e5e7eb",
};

const checkCircle: React.CSSProperties = {
  display: "inline-block",
  width: "44px",
  height: "44px",
  lineHeight: "44px",
  backgroundColor: "#dcfce7",
  color: "#16a34a",
  fontSize: "22px",
  fontWeight: "700",
  borderRadius: "50%",
  margin: "0 0 16px",
  textAlign: "center",
};

const heroGreeting: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 4px",
};

const heroMessage: React.CSSProperties = {
  color: "#111827",
  fontSize: "22px",
  fontWeight: "700",
  letterSpacing: "-0.3px",
  margin: "0 0 24px",
};

const amountDisplay: React.CSSProperties = {
  color: "#16a34a",
  fontSize: "52px",
  fontWeight: "800",
  letterSpacing: "-2px",
  lineHeight: "1",
  margin: "0 0 10px",
};

const nonprofitLine: React.CSSProperties = {
  color: "#374151",
  fontSize: "15px",
  margin: "0 0 4px",
};

const dateLine: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "13px",
  margin: "0",
};

const receiptCardSection: React.CSSProperties = {
  padding: "28px 32px",
};

const receiptCard: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  overflow: "hidden",
};

const receiptCardHeader: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  padding: "12px 20px",
  borderBottom: "1px solid #e5e7eb",
};

const receiptCardTitle: React.CSSProperties = {
  color: "#374151",
  fontSize: "12px",
  fontWeight: "600",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  margin: "0 0 2px",
  display: "inline-block",
};

const receiptNumberLabel: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "0",
  display: "inline-block",
  float: "right",
};

const receiptRowLabel: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: "500",
  width: "40%",
};

const receiptRowValue: React.CSSProperties = {
  color: "#111827",
  fontSize: "14px",
  textAlign: "right",
};

const receiptRowHighlight: React.CSSProperties = {
  color: "#16a34a",
  fontWeight: "700",
  fontSize: "15px",
};

const impactSection: React.CSSProperties = {
  padding: "0 32px 28px",
  textAlign: "center",
};

const impactIcon: React.CSSProperties = {
  fontSize: "24px",
  margin: "0 0 8px",
};

const impactText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "1.6",
  margin: "0",
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "12px 16px",
};

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "0",
};

const ctaSection: React.CSSProperties = {
  padding: "36px 32px",
  textAlign: "center",
};

const ctaHeadline: React.CSSProperties = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: "600",
  letterSpacing: "-0.2px",
  margin: "0 0 8px",
};

const ctaSubtext: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const button: React.CSSProperties = {
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

const disclaimerSection: React.CSSProperties = {
  padding: "24px 32px",
  backgroundColor: "#fafafa",
  borderTop: "1px solid #e5e7eb",
};

const disclaimerTitle: React.CSSProperties = {
  color: "#374151",
  fontSize: "12px",
  fontWeight: "600",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  margin: "0 0 8px",
};

const disclaimerText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "1.65",
  margin: "0",
};

const footer: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  borderTop: "1px solid #e5e7eb",
  padding: "20px 32px",
  textAlign: "center",
};

const footerText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 4px",
};

const footerLink: React.CSSProperties = {
  color: "#7c3aed",
  textDecoration: "none",
};

const footerMuted: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "11px",
  margin: "0",
};
