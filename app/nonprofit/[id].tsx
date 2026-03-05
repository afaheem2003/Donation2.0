import React, { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { api, Nonprofit } from "@/lib/api";
import { formatCents, COLORS } from "@/lib/utils";
import { LinearGradient } from "expo-linear-gradient";
import { DonateSheet } from "@/components/DonateSheet";
import { useAuth } from "@/context/AuthContext";

export default function NonprofitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const { user: me } = useAuth();
  const [nonprofit, setNonprofit] = useState<Nonprofit | null>(null);
  const [loading, setLoading] = useState(true);
  const [donateVisible, setDonateVisible] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.nonprofits
      .get(id)
      .then((data) => {
        setNonprofit(data);
        setFollowing(data.viewerFollowing ?? false);
        setFollowerCount(data.followerCount ?? 0);
        navigation.setOptions({ title: data.name });
      })
      .catch(() => Alert.alert("Error", "Could not load nonprofit"))
      .finally(() => setLoading(false));
  }, [id, navigation]);

  async function toggleFollow() {
    if (!me) { router.push("/auth/signin"); return; }
    setFollowLoading(true);
    try {
      const res = await api.nonprofits.follow(id!);
      setFollowing(res.following);
      setFollowerCount(res.followerCount);
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brand} size="large" />
      </View>
    );
  }

  if (!nonprofit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Nonprofit not found.</Text>
      </View>
    );
  }

  const categoryLabel = nonprofit.category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const initial = nonprofit.name[0]?.toUpperCase() ?? "N";

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Cover + logo */}
        <LinearGradient
          colors={[COLORS.brand, COLORS.brandDark]}
          style={styles.cover}
        >
          <View style={styles.logoContainer}>
            {nonprofit.logoUrl ? (
              <Image source={{ uri: nonprofit.logoUrl }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Text style={styles.logoInitial}>{initial}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Name + verified + follow */}
          <View style={styles.nameRow}>
            <View style={styles.namePrimary}>
              <Text style={styles.name}>{nonprofit.name}</Text>
              {nonprofit.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={13} color={COLORS.brand} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
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
                  <Ionicons name="checkmark" size={13} color={COLORS.brand} />
                  <Text style={[styles.followBtnText, styles.followBtnTextActive]}>Following</Text>
                </>
              ) : (
                <Text style={styles.followBtnText}>Follow</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Meta */}
          <View style={styles.metaRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{categoryLabel}</Text>
            </View>
            <Text style={styles.ein}>EIN {nonprofit.ein}</Text>
          </View>

          {/* Website */}
          {nonprofit.website && (
            <TouchableOpacity
              onPress={() => Linking.openURL(nonprofit.website!)}
              style={styles.websiteRow}
            >
              <Ionicons name="globe-outline" size={14} color={COLORS.brand} />
              <Text style={styles.websiteText}>
                {nonprofit.website.replace(/^https?:\/\//, "")}
              </Text>
            </TouchableOpacity>
          )}

          {/* Description */}
          <Text style={styles.description}>{nonprofit.description}</Text>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {formatCents(nonprofit.totalRaisedCents ?? 0)}
              </Text>
              <Text style={styles.statLabel}>Raised</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {nonprofit._count?.donations.toLocaleString() ?? "0"}
              </Text>
              <Text style={styles.statLabel}>Donors</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{followerCount.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {nonprofit._count?.posts.toLocaleString() ?? "0"}
              </Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky donate bar */}
      <View style={styles.donateBar}>
        <TouchableOpacity
          style={styles.donateBtn}
          onPress={() => setDonateVisible(true)}
        >
          <Ionicons name="heart" size={18} color={COLORS.white} />
          <Text style={styles.donateBtnText}>Donate</Text>
        </TouchableOpacity>
      </View>

      <DonateSheet
        visible={donateVisible}
        nonprofitId={nonprofit.id}
        nonprofitName={nonprofit.name}
        onClose={() => setDonateVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { paddingBottom: 110 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: COLORS.gray500, fontSize: 16 },
  cover: {
    height: 140,
    justifyContent: "flex-end",
  },
  logoContainer: {
    position: "absolute",
    bottom: -28,
    left: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  logoFallback: {
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitial: { fontSize: 28, fontWeight: "800", color: COLORS.white },
  body: { paddingHorizontal: 20, paddingTop: 40 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  namePrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  name: { fontSize: 20, fontWeight: "800", color: COLORS.gray900 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  verifiedText: { fontSize: 11, fontWeight: "600", color: COLORS.brandDark },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
  },
  followBtnActive: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
  },
  followBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.white },
  followBtnTextActive: { color: COLORS.brand },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  categoryPill: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  categoryText: { fontSize: 12, fontWeight: "600", color: COLORS.gray600 },
  ein: { fontSize: 12, color: COLORS.gray400 },
  websiteRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  websiteText: { fontSize: 13, color: COLORS.brand, fontWeight: "500" },
  description: { fontSize: 14, color: COLORS.gray600, lineHeight: 22, marginBottom: 24 },
  stats: {
    flexDirection: "row",
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 14,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 15, fontWeight: "700", color: COLORS.gray900 },
  statLabel: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.gray200 },
  donateBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    padding: 16,
    paddingBottom: 34,
  },
  donateBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  donateBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
});
