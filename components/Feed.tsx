"use client";

import { useState, useEffect, useCallback } from "react";
import { PostCard } from "@/components/PostCard";
import { Loader2 } from "lucide-react";

type Post = {
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

export function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = useCallback(async (cursor?: string) => {
    const url = `/api/feed${cursor ? `?cursor=${cursor}` : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  }, []);

  useEffect(() => {
    fetchPosts().then((data) => {
      setPosts(data.posts);
      setNextCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
      setLoading(false);
    });
  }, [fetchPosts]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchPosts(nextCursor);
    setPosts((prev) => [...prev, ...data.posts]);
    setNextCursor(data.nextCursor);
    setHasMore(!!data.nextCursor);
    setLoadingMore(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium mb-2">No posts yet</p>
        <p className="text-sm">Be the first to donate and share your moment!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 text-sm text-brand-600 font-medium hover:text-brand-700 disabled:text-gray-300"
          >
            {loadingMore ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Load more"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
