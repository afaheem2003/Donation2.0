export type ApplicationStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
export type UserRole = "DONOR" | "PLATFORM_ADMIN";

export interface ApplicationListItem {
  id: string;
  orgName: string;
  ein: string;
  category: string;
  status: ApplicationStatus;
  submittedByEmail: string;
  submittedByName: string;
  createdAt: string;
  reviewedAt: string | null;
  isClaim: boolean;
}

export interface ApplicationDetail {
  id: string;
  orgName: string;
  ein: string;
  category: string;
  status: ApplicationStatus;
  submittedByEmail: string;
  submittedByName: string;
  description: string;
  website: string | null;
  logoUrl: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  reviewNotes: string | null;
  nonprofitId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  isClaim: boolean;
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  username: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
  _count: { donations: number };
}

export interface AdminNonprofit {
  id: string;
  name: string;
  ein: string;
  category: string;
  verified: boolean;
  createdAt: string;
  _count: { donations: number; followers: number };
}

export interface AdminStats {
  totalUsers: number;
  totalNonprofits: number;
  totalDonations: number;
  totalAmountCents: number;
  pendingApplications: number;
}

export const STATUS_BADGE: Record<ApplicationStatus, { label: string; className: string }> = {
  PENDING:      { label: "Pending",      className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  UNDER_REVIEW: { label: "Under Review", className: "bg-blue-100 text-blue-700 border-blue-200" },
  APPROVED:     { label: "Approved",     className: "bg-green-100 text-green-700 border-green-200" },
  REJECTED:     { label: "Rejected",     className: "bg-red-100 text-red-700 border-red-200" },
};
