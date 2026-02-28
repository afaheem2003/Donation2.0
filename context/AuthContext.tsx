import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { api, SessionUser, clearSessionToken, setSessionToken, getSessionToken } from "@/lib/api";

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
    const expoRedirectUrl = Linking.createURL("/auth/callback");
    const relayUrl = `${BASE_URL}/api/auth/mobile-callback?redirect=${encodeURIComponent(expoRedirectUrl)}`;
    const authUrl = `${BASE_URL}/api/auth/google-signin?callbackUrl=${encodeURIComponent(relayUrl)}`;

    function extractToken(url: string): string | null {
      const match = url.match(/[?&]token=([^&#]+)/);
      return match ? decodeURIComponent(match[1]) : null;
    }

    async function applyToken(url: string) {
      const token = extractToken(url);
      if (token) {
        await setSessionToken(token);
      }
      await refreshSession();
    }

    let linkHandled = false;
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (!linkHandled && url.includes("auth/callback")) {
        linkHandled = true;
        subscription.remove();
        applyToken(url);
      }
    });

    const result = await WebBrowser.openAuthSessionAsync(authUrl, expoRedirectUrl, {
      preferEphemeralSession: true,
    });

    subscription.remove();

    if (!linkHandled) {
      if (result.type === "success") {
        await applyToken(result.url);
      }
    }
  }

  async function signOut() {
    try {
      await fetch(`${BASE_URL}/api/auth/signout`, { method: "POST" });
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
