"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { Heart, CheckCircle2, AlertCircle, Clock, LogIn } from "lucide-react";

type InviteStatus = "loading" | "valid" | "expired" | "used" | "error";

type InviteData = {
  nonprofitName: string;
  role: string;
  email: string;
};

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = params?.token as string;

  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("loading");
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/portal/invite/${token}`);
        if (res.status === 404) {
          setInviteStatus("error");
          return;
        }
        const data = await res.json();
        if (data.status === "expired") {
          setInviteStatus("expired");
        } else if (data.status === "accepted") {
          setInviteStatus("used");
        } else if (data.nonprofitName) {
          setInviteData({
            nonprofitName: data.nonprofitName,
            role: data.role ?? "Admin",
            email: data.email ?? "",
          });
          setInviteStatus("valid");
        } else {
          setInviteStatus("error");
        }
      } catch {
        setInviteStatus("error");
      }
    }
    fetchInvite();
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch(`/api/portal/invite/${token}/accept`, {
        method: "POST",
      });
      if (res.ok) {
        router.push("/portal/dashboard");
      } else {
        const data = await res.json();
        setAcceptError(data?.error ?? "Failed to accept invitation. Please try again.");
      }
    } catch {
      setAcceptError("An unexpected error occurred. Please try again.");
    } finally {
      setAccepting(false);
    }
  }

  function formatRole(role: string) {
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <Heart className="w-5 h-5 fill-brand-500 stroke-brand-500" />
        <span className="font-black text-xl text-brand-600">GiveStream</span>
      </div>

      <div className="bg-white rounded-2xl shadow-lg px-8 py-10">
        {/* Loading */}
        {inviteStatus === "loading" && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center animate-pulse">
              <div className="w-6 h-6 rounded-full bg-gray-300" />
            </div>
            <p className="text-gray-500 text-sm">Checking your invitation...</p>
          </div>
        )}

        {/* Valid invite */}
        {inviteStatus === "valid" && inviteData && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
                  <Heart className="w-6 h-6 fill-brand-500 stroke-brand-500" />
                </div>
              </div>
              <h1 className="text-xl font-black text-gray-900">You&apos;re invited!</h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                You&apos;ve been invited to join{" "}
                <span className="font-bold text-gray-900">{inviteData.nonprofitName}</span> as{" "}
                <span className="font-bold text-brand-600">{formatRole(inviteData.role)}</span> on
                GiveStream.
              </p>
              {inviteData.email && (
                <p className="text-xs text-gray-400">
                  Invitation sent to{" "}
                  <span className="font-semibold text-gray-600">{inviteData.email}</span>
                </p>
              )}
            </div>

            {/* Not signed in */}
            {sessionStatus !== "loading" && !session?.user ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 text-center">
                  Sign in to accept this invitation.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    signIn("google", {
                      callbackUrl: `/portal/invite/${token}`,
                    })
                  }
                  className="flex items-center justify-center gap-2 w-full bg-brand-600 text-white font-bold px-6 py-3 rounded-full hover:bg-brand-700 transition-colors text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  Sign in with Google to accept
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {acceptError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {acceptError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={accepting}
                  className="flex items-center justify-center gap-2 w-full bg-brand-600 text-white font-bold px-6 py-3 rounded-full hover:bg-brand-700 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {accepting ? "Accepting..." : "Accept Invitation"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Expired */}
        {inviteStatus === "expired" && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-orange-50 flex items-center justify-center">
                <Clock className="w-7 h-7 text-orange-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-gray-900">Invitation expired</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                This invite link has expired. Ask your organization admin to resend the invitation.
              </p>
            </div>
            <Link
              href="/"
              className="inline-block text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back to GiveStream
            </Link>
          </div>
        )}

        {/* Already used */}
        {inviteStatus === "used" && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-gray-900">Already accepted</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                This invitation has already been used. If you&apos;re a member, head to your portal
                dashboard.
              </p>
            </div>
            <Link
              href="/portal/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-bold px-6 py-3 rounded-full hover:bg-brand-700 transition-colors text-sm"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {/* Error / not found */}
        {inviteStatus === "error" && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-gray-900">Invalid invitation</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                This invitation link is invalid or no longer exists. Please check the link or
                contact your organization admin.
              </p>
            </div>
            <Link
              href="/"
              className="inline-block text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back to GiveStream
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
