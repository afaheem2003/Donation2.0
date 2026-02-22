"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, DollarSign, Heart } from "lucide-react";
import { PostCard } from "@/components/PostCard";
import { formatCents } from "@/lib/utils";

interface ProfileData {
  user: {
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  posts: Array<{
    id: string;
    caption: string;
    imageUrl?: string | null;
    createdAt: string;
    likeCount: number;
    commentCount: number;
    viewerLiked: boolean;
    user: { id: string; name?: string | null; username: string; avatarUrl?: string | null };
    nonprofit: { id: string; name: string; logoUrl?: string | null; verified: boolean };
    donation?: { amountCents: number; currency: string } | null;
  }>;
  totalDonatedCents: number;
  donationCount: number;
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/users/${username}`)
      .then((r) => {
        if (!r.ok) throw new Error("User not found");
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [username]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p>{error || "User not found"}</p>
        <Link href="/" className="text-brand-600 text-sm mt-2 block">Go home</Link>
      </div>
    );
  }

  const { user, posts, totalDonatedCents, donationCount } = data;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-5">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name ?? ""}
              width={72}
              height={72}
              className="rounded-full"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-700">
              {user.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{user.name ?? user.username}</h1>
            <p className="text-gray-400 text-sm">@{user.username}</p>

            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <p className="font-bold text-gray-900">{posts.length}</p>
                <p className="text-xs text-gray-400">Posts</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900">{donationCount}</p>
                <p className="text-xs text-gray-400">Donations</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900">{formatCents(totalDonatedCents)}</p>
                <p className="text-xs text-gray-400">Given</p>
              </div>
            </div>
          </div>
        </div>

        {/* Donation badge */}
        {donationCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 text-sm text-brand-600">
            <Heart className="w-4 h-4 fill-brand-200 stroke-brand-500" />
            {donationCount === 1
              ? "Made their first donation"
              : `${donationCount} total donations · ${formatCents(totalDonatedCents)} given`}
          </div>
        )}
      </div>

      {/* Posts */}
      <h2 className="font-bold text-gray-900 mb-4">Posts</h2>
      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No posts yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
