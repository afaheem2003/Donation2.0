"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, Copy, Trash2, Check, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";

interface AdminMember {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: "OWNER" | "ADMIN";
  createdAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: "OWNER" | "ADMIN";
  token: string;
  expiresAt: string;
  createdAt: string;
}

interface TeamManagerProps {
  nonprofitId: string;
}

export function TeamManager({ nonprofitId }: TeamManagerProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "OWNER">("ADMIN");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Remove state
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Copy state
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    setFetchError(null);
    try {
      const res = await fetch(`/api/portal/nonprofits/${nonprofitId}/team`);
      if (!res.ok) throw new Error("Failed to load team");
      const data = await res.json();
      setAdmins(data.admins ?? []);
      setPendingInvites(data.pendingInvites ?? []);
    } catch {
      setFetchError("Could not load team data.");
    } finally {
      setLoading(false);
    }
  }, [nonprofitId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviting(true);
    setInviteSuccess(null);
    setInviteError(null);

    try {
      const res = await fetch(
        `/api/portal/nonprofits/${nonprofitId}/team/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setInviteError(data.error ?? "Failed to send invite.");
        return;
      }

      setInviteSuccess(`Invite created for ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("ADMIN");
      await fetchTeam();
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(adminId: string) {
    setRemovingId(adminId);
    setRemoveError(null);

    try {
      const res = await fetch(
        `/api/portal/nonprofits/${nonprofitId}/team/${adminId}`,
        { method: "DELETE" }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setRemoveError(data.error ?? "Failed to remove member.");
        return;
      }

      setAdmins((prev) => prev.filter((a) => a.id !== adminId));
    } catch {
      setRemoveError("Network error. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  function handleCopyInviteLink(token: string) {
    const link = `${window.location.origin}/portal/invite/${token}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
      })
      .catch(() => null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getInitials(name: string | null, email: string | null): string {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "?";
  }

  const inputClass =
    "rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition";

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Team</h1>
          <p className="text-sm text-gray-500 mt-1">Loading team...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Team</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage admins and invite new team members.
        </p>
      </div>

      {fetchError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-2 text-sm font-medium text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {fetchError}
        </div>
      )}

      {/* Team Members */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Team Members</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {removeError && (
            <div className="px-5 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {removeError}
            </div>
          )}
          {admins.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              No team members yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {admins.map((admin) => {
                const isCurrentUser = admin.userId === currentUserId;
                return (
                  <li
                    key={admin.id}
                    className="flex items-center gap-4 px-5 py-4"
                  >
                    {/* Avatar */}
                    {admin.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={admin.avatarUrl}
                        alt={admin.name ?? ""}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-brand-700">
                        {getInitials(admin.name, admin.email)}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {admin.name ?? "Unknown"}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs font-normal text-gray-400">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {admin.email}
                      </p>
                    </div>

                    {/* Role badge */}
                    <span
                      className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        admin.role === "OWNER"
                          ? "bg-brand-50 text-brand-700 border border-brand-200"
                          : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {admin.role}
                    </span>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(admin.id)}
                      disabled={isCurrentUser || removingId === admin.id}
                      title={
                        isCurrentUser
                          ? "You cannot remove yourself"
                          : "Remove member"
                      }
                      className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Pending Invites */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Pending Invites</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {pendingInvites.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">
              No pending invites.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  {/* Email + expiry */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {invite.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      Expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>

                  {/* Role badge */}
                  <span
                    className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      invite.role === "OWNER"
                        ? "bg-brand-50 text-brand-700 border border-brand-200"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                    }`}
                  >
                    {invite.role}
                  </span>

                  {/* Copy invite link */}
                  <button
                    onClick={() => handleCopyInviteLink(invite.token)}
                    title="Copy invite link"
                    className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {copiedToken === invite.token ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy link
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Invite Form */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Send Invite</h2>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          {inviteSuccess && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm font-medium text-green-800 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              {inviteSuccess}
            </div>
          )}
          {inviteError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {inviteError}
            </div>
          )}

          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setInviteSuccess(null);
                setInviteError(null);
              }}
              placeholder="colleague@example.com"
              className={`${inputClass} flex-1`}
            />

            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "OWNER")}
              className={`${inputClass} sm:w-36`}
            >
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>

            <button
              type="submit"
              disabled={inviting}
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-full text-sm transition-colors shadow-sm whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              {inviting ? "Sending..." : "Send Invite"}
            </button>
          </form>

          <p className="mt-3 text-xs text-gray-400">
            The recipient will receive an invite link valid for 7 days. Owners can
            manage team members and send invites.
          </p>
        </div>
      </section>
    </div>
  );
}
