"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, BadgeCheck, DollarSign } from "lucide-react";
import { useSession } from "next-auth/react";
import { formatCents, formatDate } from "@/lib/utils";

interface PostCardProps {
  post: {
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
  };
}

export function PostCard({ post }: PostCardProps) {
  const { data: session } = useSession();
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<{ id: string; body: string; user: { name?: string | null; username: string } }[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  async function toggleLike() {
    if (!session) return;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
  }

  async function loadComments() {
    if (showComments) { setShowComments(false); return; }
    setLoadingComments(true);
    const res = await fetch(`/api/posts/${post.id}/comment`);
    const data = await res.json();
    setComments(data);
    setShowComments(true);
    setLoadingComments(false);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || !session) return;
    const res = await fetch(`/api/posts/${post.id}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });
    const comment = await res.json();
    setComments([...comments, comment]);
    setCommentBody("");
  }

  return (
    <article className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Link href={`/u/${post.user.username}`}>
            {post.user.avatarUrl ? (
              <Image
                src={post.user.avatarUrl}
                alt={post.user.name ?? ""}
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                {post.user.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </Link>
          <div>
            <Link href={`/u/${post.user.username}`} className="font-semibold text-sm text-gray-900 hover:text-brand-600">
              {post.user.name ?? post.user.username}
            </Link>
            <p className="text-xs text-gray-400">{formatDate(post.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Donation badge */}
      {post.donation && (
        <div className="mx-4 mb-3 flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2">
          <DollarSign className="w-4 h-4 text-brand-500" />
          <span className="text-sm text-brand-700 font-medium">
            Donated {formatCents(post.donation.amountCents, post.donation.currency)} to{" "}
          </span>
          <Link href={`/n/${post.nonprofit.id}`} className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-900">
            {post.nonprofit.name}
            {post.nonprofit.verified && <BadgeCheck className="w-3.5 h-3.5" />}
          </Link>
        </div>
      )}

      {/* Image */}
      {post.imageUrl && (
        <div className="relative w-full aspect-square bg-gray-100">
          <Image src={post.imageUrl} alt="Post image" fill className="object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-4">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 transition-colors ${liked ? "text-red-500" : "text-gray-400 hover:text-red-400"}`}
        >
          <Heart className={`w-5 h-5 ${liked ? "fill-red-500" : ""}`} />
          <span className="text-sm font-medium">{likeCount}</span>
        </button>
        <button
          onClick={loadComments}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{post.commentCount}</span>
        </button>
      </div>

      {/* Caption */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-800">
          <span className="font-semibold mr-1">{post.user.name ?? post.user.username}</span>
          {post.caption}
        </p>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-50 px-4 py-3 space-y-2">
          {loadingComments ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : (
            <>
              {comments.map((c) => (
                <p key={c.id} className="text-sm text-gray-700">
                  <span className="font-semibold mr-1">{c.user.name ?? c.user.username}</span>
                  {c.body}
                </p>
              ))}
              {session && (
                <form onSubmit={submitComment} className="flex gap-2 mt-2">
                  <input
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 text-sm border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:border-brand-400"
                  />
                  <button
                    type="submit"
                    disabled={!commentBody.trim()}
                    className="text-sm font-semibold text-brand-600 disabled:text-gray-300"
                  >
                    Post
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}
