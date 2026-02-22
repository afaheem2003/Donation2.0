import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList, View, Text, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from "react-native";
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
    const data = await api.feed.get(cursor);
    return data;
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    const data = await loadFeed();
    setPosts(data.posts);
    setNextCursor(data.nextCursor);
    setLoading(false);
  }, [loadFeed]);

  useEffect(() => { init(); }, [init]);

  async function onRefresh() {
    setRefreshing(true);
    const data = await loadFeed();
    setPosts(data.posts);
    setNextCursor(data.nextCursor);
    setRefreshing(false);
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await loadFeed(nextCursor);
    setPosts((prev) => [...prev, ...data.posts]);
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brand} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PostCard post={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>GiveStream 💚</Text>
          <Text style={styles.heroSub}>Donate. Share. Inspire.</Text>
          <TouchableOpacity
            style={styles.discoverBtn}
            onPress={() => router.push("/(tabs)/discover")}
          >
            <Text style={styles.discoverBtnText}>Browse nonprofits →</Text>
          </TouchableOpacity>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySub}>Be the first to donate and share your moment!</Text>
          <TouchableOpacity
            style={styles.discoverBtn}
            onPress={() => router.push("/(tabs)/discover")}
          >
            <Text style={styles.discoverBtnText}>Discover nonprofits →</Text>
          </TouchableOpacity>
        </View>
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={COLORS.brand} />
          </View>
        ) : null
      }
      contentContainerStyle={posts.length === 0 ? styles.emptyContainer : undefined}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: {
    backgroundColor: COLORS.brand,
    margin: 12,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  heroTitle: { color: COLORS.white, fontSize: 22, fontWeight: "800" },
  heroSub: { color: "#fce7f3", fontSize: 13, marginTop: 2, marginBottom: 12 },
  discoverBtn: {
    backgroundColor: COLORS.white,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
  },
  discoverBtnText: { color: COLORS.brandDark, fontWeight: "700", fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.gray700, marginBottom: 6 },
  emptySub: { fontSize: 13, color: COLORS.gray400, textAlign: "center", marginBottom: 16 },
  emptyContainer: { flexGrow: 1 },
  footer: { padding: 20, alignItems: "center" },
});
