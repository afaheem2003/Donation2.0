import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, SessionUser, clearSessionToken, setSessionToken } from "@/lib/api";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshSession: async () => {},
});

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await api.auth.session();
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  async function signIn() {
    // Open the Next.js sign-in page in a web browser
    // NextAuth handles the OAuth flow and sets a session cookie
    const redirectUrl = Linking.createURL("/auth/callback");
    const authUrl = `${BASE_URL}/api/auth/signin/google?callbackUrl=${encodeURIComponent(redirectUrl)}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

    if (result.type === "success") {
      // Extract session token from the redirect URL if available
      const url = result.url;
      const params = new URL(url).searchParams;
      const token = params.get("token");
      if (token) {
        await setSessionToken(token);
      }
      // Refresh session state
      await refreshSession();
    }
  }

  async function signOut() {
    try {
      await fetch(`${BASE_URL}/api/auth/signout`, { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    await clearSessionToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
