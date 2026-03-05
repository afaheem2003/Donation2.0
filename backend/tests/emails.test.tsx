/**
 * Email template tests
 *
 * Renders each template to HTML using react-dom/server and asserts that
 * key content is present in the output. Run with: npm test
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";

import { DonationReceiptEmail } from "../emails/DonationReceiptEmail";
import { ApplicationStatusEmail } from "../emails/ApplicationStatusEmail";
import { ApplicationReceivedEmail } from "../emails/ApplicationReceivedEmail";
import { TeamInviteEmail } from "../emails/TeamInviteEmail";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

// Shared fixtures — relative to real current time so expiry logic is correct
const NOW = new Date("2025-06-15T12:00:00Z"); // fixed date for formatting assertions only
const FUTURE_7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const FUTURE_1H = new Date(Date.now() + 60 * 60 * 1000);

// ─── DonationReceiptEmail ─────────────────────────────────────────────────────

describe("DonationReceiptEmail", () => {
  const baseProps = {
    donorName: "Sarah Chen",
    nonprofitName: "Doctors Without Borders USA",
    nonprofitEin: "13-3433452",
    amountCents: 5000,
    donatedAt: NOW,
    receiptNumber: "RCT-2025-A3F2B1",
    taxYear: 2025,
  };

  it("renders without throwing", () => {
    expect(() => render(<DonationReceiptEmail {...baseProps} />)).not.toThrow();
  });

  it("shows the formatted donation amount", () => {
    const html = render(<DonationReceiptEmail {...baseProps} />);
    expect(html).toContain("$50.00");
  });

  it("shows the donor first name in the greeting", () => {
    const html = render(<DonationReceiptEmail {...baseProps} />);
    expect(html).toContain("Sarah");
  });

  it("shows the nonprofit name", () => {
    const html = render(<DonationReceiptEmail {...baseProps} />);
    expect(html).toContain("Doctors Without Borders USA");
  });

  it("shows the EIN", () => {
    const html = render(<DonationReceiptEmail {...baseProps} />);
    expect(html).toContain("13-3433452");
  });

  it("shows the receipt number", () => {
    const html = render(<DonationReceiptEmail {...baseProps} />);
    expect(html).toContain("RCT-2025-A3F2B1");
  });

  it("shows the tax year", () => {
    const html = render(<DonationReceiptEmail {...baseProps} />);
    expect(html).toContain("2025");
  });

  it("formats large amounts correctly", () => {
    const html = render(
      <DonationReceiptEmail {...baseProps} amountCents={100000} />
    );
    expect(html).toContain("$1,000.00");
  });

  it("formats small amounts correctly", () => {
    const html = render(
      <DonationReceiptEmail {...baseProps} amountCents={100} />
    );
    expect(html).toContain("$1.00");
  });

  it("includes the GiveStream branding", () => {
    const html = render(<DonationReceiptEmail {...baseProps} />);
    expect(html).toContain("GiveStream");
  });

  it("includes a tax deductibility disclaimer", () => {
    const html = render(<DonationReceiptEmail {...baseProps} />);
    expect(html).toContain("501(c)(3)");
  });
});

// ─── ApplicationStatusEmail ───────────────────────────────────────────────────

describe("ApplicationStatusEmail — APPROVED", () => {
  const approvedProps = {
    applicantName: "Jordan Lee",
    orgName: "Local Arts Fund",
    status: "APPROVED" as const,
    reviewNotes: "Everything checks out — welcome to GiveStream!",
    portalUrl: "https://givestream.org/portal/dashboard",
  };

  it("renders without throwing", () => {
    expect(() =>
      render(<ApplicationStatusEmail {...approvedProps} />)
    ).not.toThrow();
  });

  it("shows the org name", () => {
    const html = render(<ApplicationStatusEmail {...approvedProps} />);
    expect(html).toContain("Local Arts Fund");
  });

  it("shows applicant first name", () => {
    const html = render(<ApplicationStatusEmail {...approvedProps} />);
    expect(html).toContain("Jordan");
  });

  it("shows approval indicator", () => {
    const html = render(<ApplicationStatusEmail {...approvedProps} />);
    // Check for approved status badge
    expect(html.toLowerCase()).toContain("approved");
  });

  it("includes reviewer notes", () => {
    const html = render(<ApplicationStatusEmail {...approvedProps} />);
    expect(html).toContain("welcome to GiveStream!");
  });

  it("includes portal link", () => {
    const html = render(<ApplicationStatusEmail {...approvedProps} />);
    expect(html).toContain("https://givestream.org/portal/dashboard");
  });

  it("shows what-to-do-next steps", () => {
    const html = render(<ApplicationStatusEmail {...approvedProps} />);
    expect(html).toContain("Set up your profile");
    expect(html).toContain("Create a campaign");
  });

  it("renders without review notes or portal url", () => {
    expect(() =>
      render(
        <ApplicationStatusEmail
          applicantName="Jordan Lee"
          orgName="Local Arts Fund"
          status="APPROVED"
        />
      )
    ).not.toThrow();
  });
});

describe("ApplicationStatusEmail — REJECTED", () => {
  const rejectedProps = {
    applicantName: "Jordan Lee",
    orgName: "Local Arts Fund",
    status: "REJECTED" as const,
    reviewNotes:
      "We were unable to verify the EIN provided. Please double-check and reapply.",
  };

  it("renders without throwing", () => {
    expect(() =>
      render(<ApplicationStatusEmail {...rejectedProps} />)
    ).not.toThrow();
  });

  it("shows the org name", () => {
    const html = render(<ApplicationStatusEmail {...rejectedProps} />);
    expect(html).toContain("Local Arts Fund");
  });

  it("shows empathetic messaging", () => {
    const html = render(<ApplicationStatusEmail {...rejectedProps} />);
    expect(html).toContain("unable to approve");
  });

  it("includes reviewer notes", () => {
    const html = render(<ApplicationStatusEmail {...rejectedProps} />);
    expect(html).toContain("unable to verify the EIN");
  });

  it("includes a reapply link", () => {
    const html = render(<ApplicationStatusEmail {...rejectedProps} />);
    expect(html).toContain("/apply");
  });

  it("does not show portal link", () => {
    const html = render(<ApplicationStatusEmail {...rejectedProps} />);
    expect(html).not.toContain("/portal/dashboard");
  });

  it("renders without review notes", () => {
    expect(() =>
      render(
        <ApplicationStatusEmail
          applicantName="Jordan Lee"
          orgName="Local Arts Fund"
          status="REJECTED"
        />
      )
    ).not.toThrow();
  });
});

// ─── ApplicationReceivedEmail ─────────────────────────────────────────────────

describe("ApplicationReceivedEmail — new application", () => {
  const props = {
    applicantName: "Jordan Lee",
    orgName: "Local Arts Fund",
  };

  it("renders without throwing", () => {
    expect(() => render(<ApplicationReceivedEmail {...props} />)).not.toThrow();
  });

  it("shows applicant first name", () => {
    const html = render(<ApplicationReceivedEmail {...props} />);
    expect(html).toContain("Jordan");
  });

  it("shows the org name", () => {
    const html = render(<ApplicationReceivedEmail {...props} />);
    expect(html).toContain("Local Arts Fund");
  });

  it("shows 'application received' messaging", () => {
    const html = render(<ApplicationReceivedEmail {...props} />);
    expect(html.toLowerCase()).toContain("application received");
  });

  it("explains the review process steps", () => {
    const html = render(<ApplicationReceivedEmail {...props} />);
    expect(html).toContain("Review");
    expect(html).toContain("Decision");
    expect(html).toContain("Go live");
  });

  it("includes support contact", () => {
    const html = render(<ApplicationReceivedEmail {...props} />);
    expect(html).toContain("support@givestream.org");
  });
});

describe("ApplicationReceivedEmail — claim", () => {
  const props = {
    applicantName: "Jordan Lee",
    orgName: "Doctors Without Borders USA",
    isClaim: true,
  };

  it("renders without throwing", () => {
    expect(() => render(<ApplicationReceivedEmail {...props} />)).not.toThrow();
  });

  it("shows 'claim received' messaging", () => {
    const html = render(<ApplicationReceivedEmail {...props} />);
    expect(html.toLowerCase()).toContain("claim received");
  });

  it("uses 'claim' wording in body text", () => {
    const html = render(<ApplicationReceivedEmail {...props} />);
    expect(html.toLowerCase()).toContain("claim");
  });

  it("shows the org name", () => {
    const html = render(<ApplicationReceivedEmail {...props} />);
    expect(html).toContain("Doctors Without Borders USA");
  });
});

// ─── TeamInviteEmail ──────────────────────────────────────────────────────────

describe("TeamInviteEmail — ADMIN role", () => {
  const props = {
    invitedByName: "Sarah Chen",
    nonprofitName: "Doctors Without Borders USA",
    role: "ADMIN" as const,
    acceptUrl: "https://givestream.org/portal/invite/test-token-abc123",
    expiresAt: FUTURE_7,
  };

  it("renders without throwing", () => {
    expect(() => render(<TeamInviteEmail {...props} />)).not.toThrow();
  });

  it("shows the inviter's name", () => {
    const html = render(<TeamInviteEmail {...props} />);
    expect(html).toContain("Sarah Chen");
  });

  it("shows the nonprofit name", () => {
    const html = render(<TeamInviteEmail {...props} />);
    expect(html).toContain("Doctors Without Borders USA");
  });

  it("shows the Admin role label", () => {
    const html = render(<TeamInviteEmail {...props} />);
    expect(html).toContain("Admin");
  });

  it("includes the accept URL", () => {
    const html = render(<TeamInviteEmail {...props} />);
    expect(html).toContain(
      "https://givestream.org/portal/invite/test-token-abc123"
    );
  });

  it("shows expiry in 7 days", () => {
    const html = render(<TeamInviteEmail {...props} />);
    expect(html).toContain("7 days");
  });

  it("includes admin role description", () => {
    const html = render(<TeamInviteEmail {...props} />);
    expect(html.toLowerCase()).toContain("manage donations");
  });
});

describe("TeamInviteEmail — OWNER role", () => {
  const props = {
    invitedByName: "Sarah Chen",
    nonprofitName: "Doctors Without Borders USA",
    role: "OWNER" as const,
    acceptUrl: "https://givestream.org/portal/invite/test-token-owner",
    expiresAt: FUTURE_7,
  };

  it("renders without throwing", () => {
    expect(() => render(<TeamInviteEmail {...props} />)).not.toThrow();
  });

  it("shows the Owner role label", () => {
    const html = render(<TeamInviteEmail {...props} />);
    expect(html).toContain("Owner");
  });

  it("includes owner role description", () => {
    const html = render(<TeamInviteEmail {...props} />);
    expect(html.toLowerCase()).toContain("full control");
  });
});

describe("TeamInviteEmail — expiry text", () => {
  const base = {
    invitedByName: "Sarah Chen",
    nonprofitName: "Doctors Without Borders USA",
    role: "ADMIN" as const,
    acceptUrl: "https://givestream.org/portal/invite/token",
  };

  it("shows 'less than 24 hours' for near-expiry", () => {
    const html = render(
      <TeamInviteEmail {...base} expiresAt={FUTURE_1H} />
    );
    expect(html).toContain("less than 24 hours");
  });

  it("shows '7 days' for 7-day expiry", () => {
    const html = render(
      <TeamInviteEmail {...base} expiresAt={FUTURE_7} />
    );
    expect(html).toContain("7 days");
  });

  it("includes a security note about unexpected invites", () => {
    const html = render(
      <TeamInviteEmail {...base} expiresAt={FUTURE_7} />
    );
    expect(html.toLowerCase()).toContain("security");
  });
});
