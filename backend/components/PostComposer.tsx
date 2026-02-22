"use client";

import { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { PenLine, X, Loader2, Image as ImageIcon } from "lucide-react";

interface PostComposerProps {
  nonprofitId: string;
  nonprofitName: string;
  donationId?: string;
  amountCents?: number;
  onPosted?: () => void;
}

export function PostComposer({
  nonprofitId,
  nonprofitName,
  donationId,
  amountCents,
  onPosted,
}: PostComposerProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState(
    amountCents
      ? `Just donated $${(amountCents / 100).toFixed(0)} to ${nonprofitName}! 🤝❤️`
      : ""
  );
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!session) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonprofitId,
          donationId,
          caption,
          ...(imageUrl && { imageUrl }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create post");
      }

      setSuccess(true);
      setOpen(false);
      onPosted?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 text-center">
        <p className="text-brand-700 font-medium">Your post was shared to the feed! 🎉</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-white border-2 border-dashed border-brand-200 rounded-2xl px-4 py-3 text-brand-500 hover:border-brand-400 hover:bg-brand-50 transition-all"
      >
        <PenLine className="w-4 h-4" />
        <span className="text-sm font-medium">Share your donation moment...</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Share your moment</h3>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt=""
              width={36}
              height={36}
              className="rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-brand-600">
                {session.user?.name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
          )}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write about your donation..."
            rows={3}
            maxLength={2200}
            className="flex-1 resize-none text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-brand-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-gray-400" />
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL (optional)"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-brand-400"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !caption.trim()}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-full hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Share post
          </button>
        </div>
      </form>
    </div>
  );
}
