import React, { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { api, UserProfile } from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { formatCents, COLORS } from "@/lib/utils";

export default function ProfileScreen() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.users
      .profile(user.username)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brand} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.signInContainer}>
        <Text style={styles.logo}>💚</Text>
        <Text style={styles.signInTitle}>Join GiveStream</Text>
        <Text style={styles.signInSub}>Sign in to donate, track receipts, and share your impact.</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={signIn}>
          <Text style={styles.signInBtnText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          {user.image ? (
            <Image source={{ uri: user.image }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase() ?? "?"}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user.name ?? user.username}</Text>
            <Text style={styles.username}>@{user.username}</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {profile && (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.donationCount}</Text>
              <Text style={styles.statLabel}>Donations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatCents(profile.totalDonatedCents)}</Text>
              <Text style={styles.statLabel}>Given</Text>
            </View>
          </View>
        )}

        {/* Donation CTA */}
        <TouchableOpacity
          style={styles.taxBtn}
          onPress={() => router.push("/(tabs)/tax")}
        >
          <Text style={styles.taxBtnText}>📋 View tax receipts & history</Text>
        </TouchableOpacity>
      </View>

      {/* Posts */}
      <Text style={styles.postsTitle}>Your posts</Text>
      {loading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 24 }} />
      ) : !profile || profile.posts.length === 0 ? (
        <View style={styles.emptyPosts}>
          <Text style={styles.emptyText}>No posts yet.</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/discover")}>
            <Text style={styles.emptyLink}>Donate and share your first moment →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        profile.posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  signInContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: COLORS.white,
  },
  logo: { fontSize: 48, marginBottom: 12 },
  signInTitle: { fontSize: 24, fontWeight: "800", color: COLORS.gray900, marginBottom: 8 },
  signInSub: { fontSize: 14, color: COLORS.gray500, textAlign: "center", marginBottom: 28, lineHeight: 20 },
  signInBtn: {
    backgroundColor: COLORS.brand,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: "center",
  },
  signInBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
  profileCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarFallback: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: COLORS.brand },
  profileInfo: { flex: 1 },
  name: { fontSize: 17, fontWeight: "700", color: COLORS.gray900 },
  username: { fontSize: 13, color: COLORS.gray400, marginTop: 2 },
  signOutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 100,
  },
  signOutText: { fontSize: 12, color: COLORS.gray500 },
  stats: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: COLORS.gray900 },
  statLabel: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.gray100 },
  taxBtn: {
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  taxBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.gray700 },
  postsTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray900, marginLeft: 16, marginBottom: 8 },
  emptyPosts: { alignItems: "center", marginTop: 32 },
  emptyText: { fontSize: 14, color: COLORS.gray400, marginBottom: 8 },
  emptyLink: { fontSize: 13, color: COLORS.brand, fontWeight: "600" },
});
