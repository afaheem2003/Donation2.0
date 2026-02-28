import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList, View, Text, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PostCard } from "@/components/PostCard";
import { api, FeedPost } from "@/lib/api";
import { COLORS } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFeed = useCallback(async (cursor?: string) => {
    return await api.feed.get(cursor);
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadFeed();
      setPosts(data.posts);
      setNextCursor(data.nextCursor);
    } catch {
      // show empty state if backend unreachable
    } finally {
      setLoading(false);
    }
  }, [loadFeed]);

  useEffect(() => { init(); }, [init]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      const data = await loadFeed();
      setPosts(data.posts);
      setNextCursor(data.nextCursor);
    } catch { /* ignore */ } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await loadFeed(nextCursor);
      setPosts((prev) => [...prev, ...data.posts]);
      setNextCursor(data.nextCursor);
    } catch { /* ignore */ } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brand} size="large" />
      </View>
    );
  }

  const userInitial = user?.name?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? "?";

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PostCard post={item} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.brand}
          colors={[COLORS.brand]}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View>
          {/* Stories-style top bar */}
          <View style={styles.storiesBar}>
            {/* User's own story circle */}
            <TouchableOpacity style={styles.storyItem} onPress={() => router.push("/donate")} activeOpacity={0.8}>
              <View style={styles.storyAddRing}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.storyAvatar} />
                ) : (
                  <View style={[styles.storyAvatar, styles.storyAvatarFallback]}>
                    <Text style={styles.storyAvatarText}>{userInitial}</Text>
                  </View>
                )}
                <View style={styles.addBadge}>
                  <Ionicons name="add" size={12} color={COLORS.white} />
                </View>
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>Donate</Text>
            </TouchableOpacity>

            {/* Discover shortcut */}
            <TouchableOpacity style={styles.storyItem} onPress={() => router.push("/(tabs)/discover")} activeOpacity={0.8}>
              <View style={styles.storyRing}>
                <View style={[styles.storyAvatar, { backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="search" size={22} color={COLORS.brand} />
                </View>
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>Discover</Text>
            </TouchableOpacity>

            {/* Trending shortcut */}
            <TouchableOpacity style={styles.storyItem} onPress={() => router.push("/(tabs)/discover")} activeOpacity={0.8}>
              <View style={styles.storyRing}>
                <View style={[styles.storyAvatar, { backgroundColor: "#FFF0ED", alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="trending-up" size={22} color="#F04438" />
                </View>
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>Trending</Text>
            </TouchableOpacity>

            {/* Impact shortcut */}
            <TouchableOpacity style={styles.storyItem} onPress={() => router.push("/(tabs)/tax")} activeOpacity={0.8}>
              <View style={styles.storyRing}>
                <View style={[styles.storyAvatar, { backgroundColor: "#EDFCF2", alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="stats-chart" size={20} color="#12B76A" />
                </View>
              </View>
              <Text style={styles.storyLabel} numberOfLines={1}>Impact</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="people-outline" size={44} color={COLORS.gray300} />
          </View>
          <Text style={styles.emptyTitle}>Follow people to see their posts</Text>
          <Text style={styles.emptySub}>
            Browse nonprofits to find donors sharing their impact, then follow them.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push("/(tabs)/discover")}
            activeOpacity={0.85}
          >
            <Ionicons name="search" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
            <Text style={styles.emptyBtnText}>Browse nonprofits</Text>
          </TouchableOpacity>
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={COLORS.brand} size="small" />
          </View>
        ) : null
      }
      contentContainerStyle={[{ paddingBottom: 110 }, posts.length === 0 && styles.emptyContainer]}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },

  // ── Stories bar ─────────────────────────────────────────────
  storiesBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 16,
  },
  storyItem: {
    alignItems: "center",
    width: 68,
  },
  storyRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.brand,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAddRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  storyAvatarFallback: {
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  storyAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.gray500,
  },
  addBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  storyLabel: {
    fontSize: 11,
    color: COLORS.gray700,
    marginTop: 4,
    fontWeight: "500",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
  },

  // ── Empty state ─────────────────────────────────────────────
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 8 },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.gray50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.gray900 },
  emptySub: { fontSize: 14, color: COLORS.gray400, textAlign: "center", lineHeight: 20, marginTop: 4 },
  emptyBtn: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  emptyContainer: { flexGrow: 1 },
  footer: { padding: 20, alignItems: "center" },
});
