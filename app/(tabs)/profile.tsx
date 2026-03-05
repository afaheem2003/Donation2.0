import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated, View, Text, Image, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { api, UserProfile, MyDonation } from "@/lib/api";
import { PostCard } from "@/components/PostCard";
import { formatCents, COLORS, timeAgo } from "@/lib/utils";

type GoalData = {
  yearlyGoalCents: number | null;
  totalDonatedThisYearCents: number;
  year: number;
};

function centsToDisplay(c: number): string {
  const dollars = Math.floor(c / 100);
  const cents = c % 100;
  const dollarsStr = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${dollarsStr}.${cents.toString().padStart(2, "0")}`;
}

function goalStatusText(pct: number): string {
  if (pct >= 100) return "Goal reached! 🎊";
  if (pct >= 75) return "Almost there! 🔥";
  if (pct >= 50) return "Halfway there!";
  if (pct >= 25) return "Great progress!";
  if (pct > 0) return "Getting started!";
  return "Make your first donation";
}

export default function ProfileScreen() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // My donations (private)
  const [myDonations, setMyDonations] = useState<MyDonation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [quickPosting, setQuickPosting] = useState<string | null>(null);

  // Goal state
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [modalCents, setModalCents] = useState(100000); // default $1,000
  const [savingGoal, setSavingGoal] = useState(false);
  const goalInputRef = useRef<TextInput>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.users.profile(user.username).then(setProfile).catch(() => {}).finally(() => setLoading(false));
    api.users.goal.get().then(setGoalData).catch(() => {});
  }, [user]);

  // Refresh donations every time the tab comes into focus (e.g. after returning from share editor)
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setDonationsLoading(true);
      api.users.myDonations().then((d) => setMyDonations(d.donations)).catch(() => {}).finally(() => setDonationsLoading(false));
    }, [user])
  );

  function openShareEditor(donation: MyDonation) {
    const post = donation.posts[0] ?? null;
    router.push({
      pathname: `/donate/share/${donation.id}` as never,
      params: {
        donationId: donation.id,
        nonprofitId: donation.nonprofit.id,
        nonprofitName: donation.nonprofit.name,
        amountCents: String(donation.amountCents),
        postId: post?.id ?? "",
        postCaption: post?.caption ?? "",
        postAllowComments: String(post?.allowComments ?? true),
      },
    });
  }

  async function handleQuickPost(donation: MyDonation, withAmount: boolean) {
    setQuickPosting(donation.id + (withAmount ? "_amt" : "_anon"));
    try {
      const created = await api.posts.create({
        nonprofitId: donation.nonprofit.id,
        donationId: withAmount ? donation.id : undefined,
        caption: "",
        allowComments: true,
      });
      setMyDonations((prev) =>
        prev.map((d) =>
          d.id === donation.id
            ? { ...d, posts: [{ id: created.id, caption: "", allowComments: true, createdAt: created.createdAt }] }
            : d
        )
      );
    } catch {
      Alert.alert("Error", "Could not post. Please try again.");
    } finally {
      setQuickPosting(null);
    }
  }

  useEffect(() => {
    if (!goalData?.yearlyGoalCents) {
      progressAnim.setValue(0);
      return;
    }
    const pct = Math.min(1, goalData.totalDonatedThisYearCents / goalData.yearlyGoalCents);
    Animated.spring(progressAnim, {
      toValue: pct,
      useNativeDriver: false,
      tension: 55,
      friction: 9,
    }).start();
  }, [goalData]);

  function openGoalModal() {
    setModalCents(goalData?.yearlyGoalCents ?? 100000);
    setGoalModalVisible(true);
    setTimeout(() => goalInputRef.current?.focus(), 150);
  }

  async function saveGoal() {
    if (modalCents === 0) return;
    setSavingGoal(true);
    try {
      const data = await api.users.goal.set(modalCents);
      setGoalData(data);
      setGoalModalVisible(false);
    } catch {
      // ignore
    } finally {
      setSavingGoal(false);
    }
  }

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
        <View style={styles.logoCircle}>
          <Ionicons name="heart" size={32} color={COLORS.brand} />
        </View>
        <Text style={styles.signInTitle}>Join GiveStream</Text>
        <Text style={styles.signInSub}>Sign in to donate, track receipts, and share your impact.</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={signIn}>
          <Text style={styles.signInBtnText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = user.name?.[0]?.toUpperCase() ?? user.username[0]?.toUpperCase() ?? "?";
  const hasGoal = goalData?.yearlyGoalCents != null && goalData.yearlyGoalCents > 0;
  const pct = hasGoal
    ? Math.min(100, Math.round((goalData!.totalDonatedThisYearCents / goalData!.yearlyGoalCents!) * 100))
    : 0;
  const currentYear = goalData?.year ?? new Date().getFullYear();
  const modalDisplayLen = centsToDisplay(modalCents).length;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarOuter}>
              {user.image ? (
                <Image source={{ uri: user.image }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{user.name ?? user.username}</Text>
              <Text style={styles.username}>@{user.username}</Text>
            </View>
            <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.gray500} />
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
                <Text style={styles.statValue}>{profile.followerCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatCents(profile.totalDonatedCents)}</Text>
                <Text style={styles.statLabel}>Given</Text>
              </View>
            </View>
          )}

          {/* Settings rows */}
          <TouchableOpacity style={styles.taxBtn} onPress={() => router.push("/(tabs)/tax")}>
            <Ionicons name="receipt-outline" size={16} color={COLORS.gray600} />
            <Text style={styles.taxBtnText}>View tax receipts</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.gray300} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
          <View style={styles.settingsDivider} />
          <TouchableOpacity style={styles.taxBtn} onPress={() => router.push("/profile/change-username" as never)}>
            <Ionicons name="at" size={16} color={COLORS.gray600} />
            <Text style={styles.taxBtnText}>Change username</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.gray300} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        </View>

        {/* ── Yearly Goal Card ── */}
        {!hasGoal ? (
          <TouchableOpacity style={styles.goalEmpty} onPress={openGoalModal} activeOpacity={0.7}>
            <View style={styles.goalEmptyIcon}>
              <Ionicons name="flag-outline" size={18} color={COLORS.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalEmptyTitle}>Set your {currentYear} giving goal</Text>
              <Text style={styles.goalEmptySubtitle}>Track your annual impact</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.brand} />
          </TouchableOpacity>
        ) : (
          <View style={styles.goalCard}>
            {/* Header row */}
            <View style={styles.goalHeader}>
              <Text style={styles.goalYear}>{currentYear} Giving Goal</Text>
              <TouchableOpacity onPress={openGoalModal} hitSlop={8} style={styles.editBtn}>
                <Ionicons name="pencil" size={13} color={COLORS.gray400} />
              </TouchableOpacity>
            </View>

            {/* Amount row */}
            <View style={styles.goalAmountRow}>
              <Text style={styles.goalDonated}>{formatCents(goalData!.totalDonatedThisYearCents)}</Text>
              <Text style={styles.goalOf}>of {formatCents(goalData!.yearlyGoalCents!)}</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                    backgroundColor: pct >= 100 ? COLORS.green : COLORS.brand,
                  },
                ]}
              />
            </View>

            {/* Footer row */}
            <View style={styles.goalFooter}>
              <Text style={styles.goalStatus}>{goalStatusText(pct)}</Text>
              <Text style={styles.goalPct}>{pct}%</Text>
            </View>
          </View>
        )}

        {/* ── My Donations (private) ── */}
        <View style={styles.sectionHeader}>
          <Ionicons name="lock-closed" size={12} color={COLORS.gray400} />
          <Text style={styles.sectionTitle}>My Donations</Text>
          <Text style={styles.sectionPrivate}>Only visible to you</Text>
        </View>

        {donationsLoading ? (
          <ActivityIndicator color={COLORS.brand} style={{ marginVertical: 16 }} />
        ) : myDonations.length === 0 ? (
          <View style={styles.emptyDonations}>
            <Ionicons name="heart-outline" size={28} color={COLORS.gray200} />
            <Text style={styles.emptyText}>No donations yet</Text>
          </View>
        ) : (
          myDonations.map((d) => {
            const post = d.posts[0] ?? null;
            const isQuickPosting = quickPosting?.startsWith(d.id);
            return (
              <View key={d.id} style={styles.donationCard}>
                <View style={styles.donationCardTop}>
                  <View style={styles.donationOrgRow}>
                    {d.nonprofit.logoUrl ? (
                      <Image source={{ uri: d.nonprofit.logoUrl }} style={styles.donationLogo} />
                    ) : (
                      <View style={[styles.donationLogo, styles.donationLogoFallback]}>
                        <Text style={styles.donationLogoText}>{d.nonprofit.name[0]}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.donationOrg} numberOfLines={1}>{d.nonprofit.name}</Text>
                      <Text style={styles.donationMeta}>
                        {formatCents(d.amountCents, d.currency)} · {timeAgo(d.donatedAt)}
                      </Text>
                    </View>
                    {post ? (
                      <View style={styles.postedPill}>
                        <Ionicons name="checkmark-circle" size={12} color={COLORS.green} />
                        <Text style={styles.postedPillText}>Posted</Text>
                      </View>
                    ) : (
                      <View style={styles.unpostedPill}>
                        <Text style={styles.unpostedPillText}>Not shared</Text>
                      </View>
                    )}
                  </View>

                  {post && (
                    <View style={styles.existingPost}>
                      <Text style={styles.existingPostCaption} numberOfLines={2}>{post.caption}</Text>
                      <TouchableOpacity style={styles.editPostBtn} onPress={() => openShareEditor(d)}>
                        <Ionicons name="pencil-outline" size={13} color={COLORS.brand} />
                        <Text style={styles.editPostBtnText}>Edit post</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!post && (
                    <View style={styles.quickShareRow}>
                      {isQuickPosting ? (
                        <ActivityIndicator color={COLORS.brand} size="small" style={{ marginVertical: 8 }} />
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.quickShareBtn}
                            onPress={() => handleQuickPost(d, false)}
                            disabled={isQuickPosting}
                          >
                            <Ionicons name="person-outline" size={14} color={COLORS.gray600} />
                            <Text style={styles.quickShareBtnText}>Just donated</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.quickShareBtn}
                            onPress={() => handleQuickPost(d, true)}
                            disabled={isQuickPosting}
                          >
                            <Ionicons name="cash-outline" size={14} color={COLORS.brand} />
                            <Text style={[styles.quickShareBtnText, { color: COLORS.brand }]}>
                              {formatCents(d.amountCents)}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.quickShareBtn, { backgroundColor: COLORS.brandLight }]}
                            onPress={() => openShareEditor(d)}
                            disabled={isQuickPosting}
                          >
                            <Ionicons name="create-outline" size={14} color={COLORS.brand} />
                            <Text style={[styles.quickShareBtnText, { color: COLORS.brand }]}>Custom</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* Posts section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Posts</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.brand} style={{ marginTop: 24 }} />
        ) : !profile || profile.posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <Ionicons name="images-outline" size={36} color={COLORS.gray200} />
            <Text style={styles.emptyText}>No posts yet</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/discover")}>
              <Text style={styles.emptyLink}>Make your first donation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          profile.posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </ScrollView>

      {/* ── Goal Modal ── */}
      <Modal visible={goalModalVisible} transparent animationType="fade" statusBarTranslucent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => goalInputRef.current?.focus()}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => goalInputRef.current?.focus()}>
              <View style={styles.modalIconRow}>
                <View style={styles.modalIconBadge}>
                  <Ionicons name="flag" size={18} color={COLORS.brand} />
                </View>
              </View>

              <Text style={styles.modalTitle}>Set {currentYear} Giving Goal</Text>
              <Text style={styles.modalSubtitle}>How much do you want to donate this year?</Text>

              {/* ATM-style amount display */}
              <View style={styles.modalAmountRow}>
                <Text style={[
                  styles.modalDollar,
                  { fontSize: modalDisplayLen <= 6 ? 28 : modalDisplayLen <= 9 ? 22 : 18 },
                ]}>$</Text>
                <Text style={[
                  styles.modalAmount,
                  { fontSize: modalDisplayLen <= 6 ? 52 : modalDisplayLen <= 9 ? 40 : 32 },
                ]}>
                  {centsToDisplay(modalCents)}
                </Text>
              </View>

              {/* Hidden ATM input */}
              <TextInput
                ref={goalInputRef}
                style={styles.hiddenInput}
                value={centsToDisplay(modalCents)}
                onChangeText={() => {}}
                keyboardType="number-pad"
                caretHidden
                showSoftInputOnFocus
                onKeyPress={({ nativeEvent }) => {
                  const { key } = nativeEvent;
                  if (key === "Backspace") {
                    setModalCents((c) => Math.floor(c / 10));
                  } else if (key >= "0" && key <= "9") {
                    const digit = parseInt(key, 10);
                    setModalCents((c) => (c < 10_000_000 ? c * 10 + digit : c));
                  }
                }}
              />

              <TouchableOpacity
                style={[styles.saveBtn, modalCents === 0 && styles.saveBtnDisabled]}
                onPress={saveGoal}
                disabled={modalCents === 0 || savingGoal}
                activeOpacity={0.85}
              >
                {savingGoal ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Set Goal</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setGoalModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 110 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Sign-in
  signInContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  signInTitle: { fontSize: 24, fontWeight: "800", color: COLORS.gray900, marginTop: 4 },
  signInSub: { fontSize: 14, color: COLORS.gray500, textAlign: "center", lineHeight: 20, marginBottom: 8 },
  signInBtn: {
    backgroundColor: COLORS.brand,
    width: "100%",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  signInBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },

  // Profile card
  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatarOuter: {
    borderWidth: 2.5,
    borderColor: COLORS.brand,
    borderRadius: 33,
    padding: 2,
  },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarFallback: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: COLORS.brandDark },
  profileInfo: { flex: 1 },
  name: { fontSize: 17, fontWeight: "700", color: COLORS.gray900 },
  username: { fontSize: 13, color: COLORS.gray400, marginTop: 2 },
  signOutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "700", color: COLORS.gray900 },
  statLabel: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.gray100 },
  taxBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 12,
  },
  taxBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.gray700 },
  settingsDivider: { height: 1, backgroundColor: COLORS.gray100, marginHorizontal: 2 },

  // Goal — empty state
  goalEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.brandLight,
    borderStyle: "dashed",
    backgroundColor: COLORS.white,
  },
  goalEmptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  goalEmptyTitle: { fontSize: 14, fontWeight: "700", color: COLORS.gray800 },
  goalEmptySubtitle: { fontSize: 12, color: COLORS.gray400, marginTop: 1 },

  // Goal card
  goalCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  goalYear: { fontSize: 12, fontWeight: "700", color: COLORS.gray400, textTransform: "uppercase", letterSpacing: 0.5 },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  goalAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 12,
  },
  goalDonated: { fontSize: 22, fontWeight: "800", color: COLORS.gray900 },
  goalOf: { fontSize: 13, color: COLORS.gray400, fontWeight: "500" },
  progressTrack: {
    height: 8,
    borderRadius: 100,
    backgroundColor: COLORS.gray100,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 100,
  },
  goalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  goalStatus: { fontSize: 12, color: COLORS.gray500, fontWeight: "500" },
  goalPct: { fontSize: 13, fontWeight: "800", color: COLORS.brand },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray900 },
  sectionPrivate: { fontSize: 11, color: COLORS.gray400, fontWeight: "500" },

  // My Donations
  emptyDonations: { alignItems: "center", paddingVertical: 20, gap: 6 },
  donationCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.gray100,
    overflow: "hidden",
  },
  donationCardTop: { padding: 14 },
  donationOrgRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  donationLogo: { width: 38, height: 38, borderRadius: 10 },
  donationLogoFallback: { backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  donationLogoText: { fontSize: 16, fontWeight: "800", color: COLORS.brandDark },
  donationOrg: { fontSize: 14, fontWeight: "700", color: COLORS.gray900 },
  donationMeta: { fontSize: 12, color: COLORS.gray400, marginTop: 1 },
  postedPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#ECFDF3", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  postedPillText: { fontSize: 11, fontWeight: "700", color: COLORS.green },
  unpostedPill: {
    backgroundColor: COLORS.gray100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  unpostedPillText: { fontSize: 11, fontWeight: "600", color: COLORS.gray500 },
  existingPost: {
    backgroundColor: COLORS.bg, borderRadius: 10, padding: 10, marginTop: 2,
  },
  existingPostCaption: { fontSize: 13, color: COLORS.gray700, lineHeight: 18, marginBottom: 8 },
  editPostBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: COLORS.white, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.brandLight,
  },
  editPostBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.brand },
  quickShareRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  quickShareBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    backgroundColor: COLORS.bg, borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 4,
    borderWidth: 1, borderColor: COLORS.gray100,
  },
  quickShareBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.gray700 },

  // Posts section
  emptyPosts: { alignItems: "center", marginTop: 40, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.gray400, marginTop: 4 },
  emptyLink: { fontSize: 13, color: COLORS.brand, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    alignItems: "center",
  },
  modalIconRow: { marginBottom: 16 },
  modalIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.gray900,
    marginBottom: 4,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.gray400,
    marginBottom: 24,
    textAlign: "center",
  },
  modalAmountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    marginBottom: 28,
    minHeight: 68,
  },
  modalDollar: {
    fontWeight: "800",
    color: COLORS.gray400,
    marginBottom: 6,
  },
  modalAmount: {
    fontWeight: "800",
    color: COLORS.gray900,
    letterSpacing: -1,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  saveBtn: {
    backgroundColor: COLORS.brand,
    width: "100%",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
  cancelBtn: { marginTop: 12, paddingVertical: 8, width: "100%", alignItems: "center" },
  cancelText: { fontSize: 14, color: COLORS.gray400, fontWeight: "600" },
});
