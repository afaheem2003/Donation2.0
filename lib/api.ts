import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const SESSION_KEY = "givestream_session";

// Store/retrieve session cookie from NextAuth
export async function getSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function setSessionToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  return SecureStore.deleteItemAsync(SESSION_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const sessionToken = await getSessionToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  // Handle CSV/non-JSON responses
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as T;
}

// ─── Nonprofits ──────────────────────────────────────────────────────────────

export interface Nonprofit {
  id: string;
  name: string;
  ein: string;
  description: string;
  category: string;
  website?: string | null;
  logoUrl?: string | null;
  verified: boolean;
  latitude?: number | null;
  longitude?: number | null;
  totalRaisedCents?: number;
  followerCount?: number;
  viewerFollowing?: boolean;
  _count?: { donations: number; posts: number };
}

export const api = {
  nonprofits: {
    list: (params?: { search?: string; category?: string; page?: number }) => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {}).reduce<Record<string, string>>((acc, [k, v]) => {
          if (v !== undefined) acc[k] = String(v);
          return acc;
        }, {})
      ).toString();
      return request<{ nonprofits: Nonprofit[]; total: number; page: number; pages: number }>(
        `/api/nonprofits${qs ? `?${qs}` : ""}`
      );
    },
    get: (id: string) => request<Nonprofit>(`/api/nonprofits/${id}`),
    follow: (id: string) =>
      request<{ following: boolean; followerCount: number }>(
        `/api/nonprofits/${id}/follow`,
        { method: "POST" }
      ),
  },

  feed: {
    get: (cursor?: string) =>
      request<{ posts: FeedPost[]; nextCursor?: string }>(
        `/api/feed${cursor ? `?cursor=${cursor}` : ""}`
      ),
  },

  posts: {
    create: (data: { nonprofitId: string; donationId?: string; caption: string; imageUrl?: string; allowComments?: boolean }) =>
      request<FeedPost>("/api/posts", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { caption?: string; allowComments?: boolean }) =>
      request<PostSummary>(`/api/posts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ deleted: boolean }>(`/api/posts/${id}`, { method: "DELETE" }),
    like: (id: string) =>
      request<{ liked: boolean }>(`/api/posts/${id}/like`, { method: "POST" }),
    getComments: (id: string) => request<Comment[]>(`/api/posts/${id}/comment`),
    addComment: (id: string, body: string) =>
      request<Comment>(`/api/posts/${id}/comment`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
  },

  donations: {
    get: (id: string) => request<DonationDetail>(`/api/donations/${id}`),
    mock: (nonprofitId: string, amountCents: number) =>
      request<{ donationId: string }>("/api/donations/mock", {
        method: "POST",
        body: JSON.stringify({ nonprofitId, amountCents }),
      }),
  },

  stripe: {
    createCheckoutSession: (nonprofitId: string, amountCents: number) =>
      request<{ url: string }>("/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ nonprofitId, amountCents }),
      }),
    createPaymentIntent: (nonprofitId: string, amountCents: number) =>
      request<{ paymentIntent: string; donationId: string }>(
        "/api/stripe/payment-intent",
        { method: "POST", body: JSON.stringify({ nonprofitId, amountCents }) }
      ),
  },

  tax: {
    summary: (year: number) =>
      request<{ year: number; donations: TaxDonation[]; totalCents: number }>(
        `/api/tax?year=${year}`
      ),
    exportCsvUrl: (year: number) => `${BASE_URL}/api/tax/export?year=${year}`,
  },

  users: {
    profile: (username: string) =>
      request<UserProfile>(`/api/users/${username}`),
    follow: (username: string) =>
      request<{ following: boolean; followerCount: number }>(
        `/api/users/${username}/follow`,
        { method: "POST" }
      ),
    goal: {
      get: () =>
        request<{ yearlyGoalCents: number | null; totalDonatedThisYearCents: number; year: number }>(
          "/api/users/me/goal"
        ),
      set: (yearlyGoalCents: number) =>
        request<{ yearlyGoalCents: number | null; totalDonatedThisYearCents: number; year: number }>(
          "/api/users/me/goal",
          { method: "PATCH", body: JSON.stringify({ yearlyGoalCents }) }
        ),
    },
    myDonations: () =>
      request<{ donations: MyDonation[] }>("/api/users/me/donations"),
    setUsername: (username: string) =>
      request<{ username: string; usernameSet: boolean }>(
        "/api/users/me/username",
        { method: "PATCH", body: JSON.stringify({ username }) }
      ),
    search: (q: string) =>
      request<{ users: UserSearchResult[] }>(
        `/api/users/search?q=${encodeURIComponent(q)}`
      ),
  },

  auth: {
    session: () => request<{ user: SessionUser | null }>("/api/me"),
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PostSummary {
  id: string;
  caption: string;
  allowComments: boolean;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  caption: string;
  imageUrl?: string | null;
  allowComments: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  viewerLiked: boolean;
  user: { id: string; name?: string | null; username: string; avatarUrl?: string | null };
  nonprofit: { id: string; name: string; logoUrl?: string | null; verified: boolean };
  donation?: { amountCents: number; currency: string } | null;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name?: string | null; username: string; avatarUrl?: string | null };
}

export interface DonationDetail {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  donatedAt: string;
  nonprofit: { id: string; name: string; ein: string };
  receipt: { receiptNumber: string; taxYear: number; legalText: string } | null;
}

export interface TaxDonation {
  id: string;
  amountCents: number;
  currency: string;
  donatedAt: string;
  nonprofit: { id: string; name: string; ein: string; logoUrl?: string | null };
  receipt: { receiptNumber: string; taxYear: number; legalText: string } | null;
  posts: PostSummary[];
}

export interface MyDonation {
  id: string;
  amountCents: number;
  currency: string;
  donatedAt: string;
  nonprofit: { id: string; name: string; logoUrl?: string | null };
  posts: PostSummary[];
}

export interface UserSearchResult {
  id: string;
  name?: string | null;
  username: string;
  avatarUrl?: string | null;
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username: string;
  role: string;
  usernameSet: boolean;
}

export interface UserProfile {
  user: { id: string; name?: string | null; username: string; avatarUrl?: string | null; createdAt: string };
  posts: FeedPost[];
  totalDonatedCents: number;
  donationCount: number;
  followerCount: number;
  followingCount: number;
  viewerFollowing: boolean;
}
