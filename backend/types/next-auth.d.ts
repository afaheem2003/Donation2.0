import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      usernameSet: boolean;
      hasNonprofitAccess: boolean;
      onboardingComplete: boolean;
      interests: string[];
    } & DefaultSession["user"];
  }
}

// Extend the AdapterUser so the session() callback in auth.ts can read
// our custom fields without `as` casts.
declare module "next-auth/adapters" {
  interface AdapterUser {
    username?: string;
    role?: string;
    usernameSet?: boolean;
    onboardingComplete?: boolean;
    interests?: string[];
  }
}
