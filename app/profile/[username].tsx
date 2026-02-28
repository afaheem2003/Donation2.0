import React, { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { api, UserProfile } from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { formatCents, COLORS } from "@/lib/utils";

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: me } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!username) return;
    api.users
      .profile(username)
      .then((data) => {
        setProfile(data);
        setFollowing(data.viewerFollowing);
        setFollowerCount(data.followerCount);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

  async function toggleFollow() {
    if (!me) { router.push("/auth/signin"); return; }
    setFollowLoading(true);
    try {
      const res = await api.users.follow(username);
      setFollowing(res.following);
      setFollowerCount(res.followerCount);
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  }

  const isMe = me?.username === username;

  const BANNER_H = 130;
  const AVATAR_SIZE = 96;
  const AVATAR_OVERLAP = AVATAR_SIZE / 2 + 4; // how far avatar hangs below banner

  const displayName = profile?.user.name ?? profile?.user.username ?? username;
  const initial = displayName[0]?.toUpperCase() ?? "?";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.brand} size="large" />
        </View>
      ) : !profile ? (
        <>
          {/* Back button even on error */}
          <TouchableOpacity
            style={[styles.floatBack, { top: insets.top + 8 }]}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.gray900} />
          </TouchableOpacity>
          <View style={styles.center}>
            <Ionicons name="person-outline" size={40} color={COLORS.gray200} />
            <Text style={styles.errorText}>User not found.</Text>
          </View>
        </>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Banner ── */}
          <View style={[styles.banner, { height: BANNER_H }]}>
            {/* Floating back button */}
            <TouchableOpacity
              style={styles.floatBackBtn}
              onPress={() => router.back()}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.brandDark} />
            </TouchableOpacity>

            {/* Decorative circles */}
            <View style={styles.bannerCircle1} />
            <View style={styles.bannerCircle2} />
          </View>

          {/* ── Profile card ── */}
          <View style={styles.profileCard}>
            {/* Avatar — overlaps banner */}
            <View style={[styles.avatarWrap, { marginTop: -AVATAR_OVERLAP }]}>
              {profile.user.avatarUrl ? (
                <Image source={{ uri: profile.user.avatarUrl }} style={[styles.avatar, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
            </View>

            {/* Name + handle */}
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.handle}>@{profile.user.username}</Text>

            {/* Donation badge */}
            {profile.totalDonatedCents > 0 && (
              <View style={styles.donatedBadge}>
                <Ionicons name="heart" size={12} color={COLORS.brand} />
                <Text style={styles.donatedBadgeText}>
                  {formatCents(profile.totalDonatedCents)} donated
                </Text>
              </View>
            )}

            {/* Follow / Edit profile button */}
            {!isMe && (
              <TouchableOpacity
                style={[styles.followBtn, following && styles.followBtnActive]}
                onPress={toggleFollow}
                disabled={followLoading}
                activeOpacity={0.8}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color={following ? COLORS.brand : COLORS.white} />
                ) : following ? (
                  <>
                    <Ionicons name="checkmark" size={14} color={COLORS.brand} />
                    <Text style={[styles.followBtnText, styles.followBtnTextActive]}>Following</Text>
                  </>
                ) : (
                  <Text style={styles.followBtnText}>Follow</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── Stats card ── */}
          <View style={styles.statsCard}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.donationCount}</Text>
              <Text style={styles.statLabel}>Donations</Text>
            </View>
          </View>

          {/* ── Posts section ── */}
          <View style={styles.postsHeader}>
            <Ionicons name="grid-outline" size={15} color={COLORS.gray500} />
            <Text style={styles.postsLabel}>Posts</Text>
          </View>

          {profile.posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons name="images-outline" size={40} color={COLORS.gray200} />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtitle}>
                {isMe ? "Donate to a nonprofit and share your impact!" : `${displayName} hasn't posted yet.`}
              </Text>
            </View>
          ) : (
            profile.posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { color: COLORS.gray400, fontSize: 15 },

  // Floating back for error state
  floatBack: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  // Banner
  banner: {
    backgroundColor: COLORS.brandLight,
    overflow: "hidden",
  },
  floatBackBtn: {
    position: "absolute",
    top: 14,
    left: 16,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(0,180,166,0.12)",
    top: -60,
    right: -30,
  },
  bannerCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0,180,166,0.08)",
    bottom: -20,
    right: 80,
  },

  // Profile card
  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 0,
    borderRadius: 20,
    alignItems: "center",
    paddingBottom: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  avatarWrap: {
    borderRadius: 100,
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    marginBottom: 12,
  },
  avatar: {},
  avatarFallback: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 34, fontWeight: "800", color: COLORS.brand },
  name: { fontSize: 20, fontWeight: "800", color: COLORS.gray900, textAlign: "center" },
  handle: { fontSize: 13, color: COLORS.gray400, marginTop: 2, marginBottom: 12, textAlign: "center" },
  donatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginBottom: 16,
  },
  donatedBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.brandDark },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 100,
    marginTop: 4,
    minWidth: 130,
    justifyContent: "center",
  },
  followBtnActive: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
  },
  followBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.white },
  followBtnTextActive: { color: COLORS.brand },

  // Stats card
  statsCard: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "800", color: COLORS.gray900 },
  statLabel: { fontSize: 11, color: COLORS.gray400, marginTop: 3 },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.gray100 },

  // Posts
  postsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 8,
  },
  postsLabel: { fontSize: 14, fontWeight: "700", color: COLORS.gray700 },
  emptyPosts: { alignItems: "center", marginTop: 40, gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray700 },
  emptySubtitle: { fontSize: 13, color: COLORS.gray400, textAlign: "center", lineHeight: 20 },
});
