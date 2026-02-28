import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, Alert, Image, Modal,
  TextInput, Switch, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, TaxDonation, PostSummary } from "@/lib/api";
import { formatCents, formatDate, COLORS } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

type ComposeModal = {
  donation: TaxDonation;
  mode: "create" | "edit";
  post: PostSummary | null;
};

export default function TaxScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [donations, setDonations] = useState<TaxDonation[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Post management state
  const [composeModal, setComposeModal] = useState<ComposeModal | null>(null);
  const [composeCaption, setComposeCaption] = useState("");
  const [composeAllowComments, setComposeAllowComments] = useState(true);
  const [composing, setComposing] = useState(false);
  const [quickPosting, setQuickPosting] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth/signin"); return; }
    setLoading(true);
    api.tax
      .summary(year)
      .then((data) => { setDonations(data.donations); setTotalCents(data.totalCents); })
      .catch(() => Alert.alert("Error", "Could not load tax data"))
      .finally(() => setLoading(false));
  }, [year, user, authLoading, router]);

  function handleExport() {
    const url = api.tax.exportCsvUrl(year);
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open export URL"));
  }

  // ── Post management ──────────────────────────────────────────────────────

  function openCreateModal(donation: TaxDonation) {
    setComposeCaption(`Just donated ${formatCents(donation.amountCents)} to ${donation.nonprofit.name}!`);
    setComposeAllowComments(true);
    setComposeModal({ donation, mode: "create", post: null });
  }

  function openEditModal(donation: TaxDonation, post: PostSummary) {
    setComposeCaption(post.caption);
    setComposeAllowComments(post.allowComments);
    setComposeModal({ donation, mode: "edit", post });
  }

  async function createQuickPost(donation: TaxDonation, withAmount: boolean) {
    setQuickPosting(donation.id);
    try {
      const caption = withAmount
        ? `Just donated ${formatCents(donation.amountCents)} to ${donation.nonprofit.name}!`
        : `Just donated to ${donation.nonprofit.name}!`;
      const newPost = await api.posts.create({
        nonprofitId: donation.nonprofit.id,
        donationId: donation.id,
        caption,
        allowComments: true,
      });
      const summary: PostSummary = {
        id: newPost.id,
        caption: newPost.caption,
        allowComments: newPost.allowComments,
        createdAt: newPost.createdAt,
      };
      setDonations((prev) =>
        prev.map((d) => d.id === donation.id ? { ...d, posts: [summary] } : d)
      );
    } catch {
      Alert.alert("Couldn't post", "Please try again.");
    } finally {
      setQuickPosting(null);
    }
  }

  async function handleComposeSubmit() {
    if (!composeModal || !composeCaption.trim()) return;
    setComposing(true);
    try {
      if (composeModal.mode === "create") {
        const newPost = await api.posts.create({
          nonprofitId: composeModal.donation.nonprofit.id,
          donationId: composeModal.donation.id,
          caption: composeCaption.trim(),
          allowComments: composeAllowComments,
        });
        const summary: PostSummary = {
          id: newPost.id,
          caption: newPost.caption,
          allowComments: newPost.allowComments,
          createdAt: newPost.createdAt,
        };
        setDonations((prev) =>
          prev.map((d) => d.id === composeModal.donation.id ? { ...d, posts: [summary] } : d)
        );
      } else if (composeModal.post) {
        const updated = await api.posts.update(composeModal.post.id, {
          caption: composeCaption.trim(),
          allowComments: composeAllowComments,
        });
        setDonations((prev) =>
          prev.map((d) =>
            d.id === composeModal.donation.id ? { ...d, posts: [updated] } : d
          )
        );
      }
      setComposeModal(null);
    } catch {
      Alert.alert("Error", "Could not save post.");
    } finally {
      setComposing(false);
    }
  }

  function handleDeletePost(donationId: string, postId: string, closeModal = false) {
    Alert.alert("Delete post?", "This will remove your post from the feed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.posts.delete(postId);
            setDonations((prev) =>
              prev.map((d) => d.id === donationId ? { ...d, posts: [] } : d)
            );
            if (closeModal) setComposeModal(null);
          } catch {
            Alert.alert("Error", "Could not delete post.");
          }
        },
      },
    ]);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brand} size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Year picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
          {YEARS.map((y) => (
            <TouchableOpacity
              key={y}
              style={[styles.yearBtn, year === y && styles.yearBtnActive]}
              onPress={() => setYear(y)}
            >
              <Text style={[styles.yearText, year === y && styles.yearTextActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total donated in {year}</Text>
          <Text style={styles.summaryAmount}>{formatCents(totalCents)}</Text>
          <View style={styles.summaryFooter}>
            <Text style={styles.summaryCount}>
              {donations.length} donation{donations.length !== 1 ? "s" : ""}
            </Text>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
              <Ionicons name="download-outline" size={14} color={COLORS.brandDark} />
              <Text style={styles.exportBtnText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Donation list */}
        {donations.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={44} color={COLORS.gray200} />
            <Text style={styles.emptyTitle}>No donations in {year}</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/discover")}>
              <Text style={styles.emptyLink}>Find nonprofits to support</Text>
            </TouchableOpacity>
          </View>
        ) : (
          donations.map((d) => {
            const activePost = d.posts[0] ?? null;
            const isExpanded = expanded === d.id;
            return (
              <View key={d.id} style={styles.donationCard}>
                {/* Collapsed row */}
                <TouchableOpacity
                  style={styles.donationRow}
                  onPress={() => setExpanded(isExpanded ? null : d.id)}
                >
                  {d.nonprofit.logoUrl ? (
                    <Image source={{ uri: d.nonprofit.logoUrl }} style={styles.logo} />
                  ) : (
                    <View style={[styles.logo, styles.logoFallback]}>
                      <Text style={styles.logoInitial}>{d.nonprofit.name[0]}</Text>
                    </View>
                  )}
                  <View style={styles.donationInfo}>
                    <Text style={styles.donationOrg} numberOfLines={1}>{d.nonprofit.name}</Text>
                    <Text style={styles.donationDate}>{formatDate(d.donatedAt)}</Text>
                  </View>
                  <View style={styles.donationRight}>
                    <Text style={styles.donationAmount}>{formatCents(d.amountCents, d.currency)}</Text>
                    <View style={styles.statusRow}>
                      {d.receipt && (
                        <Text style={styles.receiptNum}>{d.receipt.receiptNumber}</Text>
                      )}
                      {activePost && (
                        <View style={styles.postedPill}>
                          <Ionicons name="share-social" size={10} color={COLORS.brand} />
                          <Text style={styles.postedPillText}>Posted</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={COLORS.gray300}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>

                {/* Expanded content */}
                {isExpanded && (
                  <View>
                    {/* Receipt */}
                    {d.receipt && (
                      <View style={styles.receiptExpanded}>
                        <View style={styles.receiptTitleRow}>
                          <Ionicons name="document-text-outline" size={14} color={COLORS.gray600} />
                          <Text style={styles.receiptTitle}>Tax Receipt</Text>
                        </View>
                        <Text style={styles.receiptText}>{d.receipt.legalText}</Text>
                        <View style={styles.receiptMeta}>
                          <Text style={styles.receiptMetaText}>EIN: {d.nonprofit.ein}</Text>
                          <Text style={styles.receiptMetaText}>Tax Year: {d.receipt.taxYear}</Text>
                        </View>
                      </View>
                    )}

                    {/* Post management section */}
                    <View style={styles.postSection}>
                      <View style={styles.postSectionHeader}>
                        <Ionicons name="share-social-outline" size={13} color={COLORS.gray500} />
                        <Text style={styles.postSectionLabel}>IMPACT POST</Text>
                      </View>

                      {activePost ? (
                        /* ── Has a post ── */
                        <View>
                          <View style={styles.postedStatusRow}>
                            <Ionicons name="checkmark-circle" size={15} color={COLORS.green} />
                            <Text style={styles.postedStatusText}>Shared to feed</Text>
                          </View>
                          <Text style={styles.activePostCaption} numberOfLines={3}>
                            {activePost.caption}
                          </Text>
                          <View style={styles.postMetaRow}>
                            <Ionicons
                              name={activePost.allowComments ? "chatbubble-outline" : "chatbubble-ellipses-outline"}
                              size={12}
                              color={COLORS.gray400}
                            />
                            <Text style={styles.postMetaText}>
                              {activePost.allowComments ? "Comments on" : "Comments off"}
                            </Text>
                            <Text style={styles.postMetaDot}>·</Text>
                            <Text style={styles.postMetaText}>{formatDate(activePost.createdAt)}</Text>
                          </View>
                          <View style={styles.postActionBtns}>
                            <TouchableOpacity
                              style={styles.editPostBtn}
                              onPress={() => openEditModal(d, activePost)}
                            >
                              <Ionicons name="pencil-outline" size={14} color={COLORS.brand} />
                              <Text style={styles.editPostBtnText}>Edit post</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deletePostBtn}
                              onPress={() => handleDeletePost(d.id, activePost.id)}
                            >
                              <Ionicons name="trash-outline" size={14} color={COLORS.red} />
                              <Text style={styles.deletePostBtnText}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        /* ── No post yet ── */
                        <View>
                          {quickPosting === d.id ? (
                            <View style={styles.quickPostingLoader}>
                              <ActivityIndicator size="small" color={COLORS.brand} />
                              <Text style={styles.quickPostingText}>Posting...</Text>
                            </View>
                          ) : (
                            <>
                              <Text style={styles.noPostHint}>Not shared yet — choose how to share:</Text>
                              <View style={styles.quickShareGrid}>
                                <TouchableOpacity
                                  style={styles.quickShareOption}
                                  onPress={() => createQuickPost(d, false)}
                                  activeOpacity={0.75}
                                >
                                  <View style={[styles.quickShareIcon, { backgroundColor: "#EEF4FF" }]}>
                                    <Ionicons name="person-outline" size={18} color="#4A90E2" />
                                  </View>
                                  <Text style={styles.quickShareTitle}>Just donated</Text>
                                  <Text style={styles.quickShareSub}>Hides amount</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.quickShareOption}
                                  onPress={() => createQuickPost(d, true)}
                                  activeOpacity={0.75}
                                >
                                  <View style={[styles.quickShareIcon, { backgroundColor: COLORS.brandLight }]}>
                                    <Ionicons name="cash-outline" size={18} color={COLORS.brand} />
                                  </View>
                                  <Text style={styles.quickShareTitle}>{formatCents(d.amountCents)}</Text>
                                  <Text style={styles.quickShareSub}>Shows amount</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={styles.quickShareOption}
                                  onPress={() => openCreateModal(d)}
                                  activeOpacity={0.75}
                                >
                                  <View style={[styles.quickShareIcon, { backgroundColor: "#FFF3E0" }]}>
                                    <Ionicons name="create-outline" size={18} color="#FF9500" />
                                  </View>
                                  <Text style={styles.quickShareTitle}>Custom</Text>
                                  <Text style={styles.quickShareSub}>Write your own</Text>
                                </TouchableOpacity>
                              </View>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Compose / Edit modal ── */}
      <Modal
        visible={composeModal !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setComposeModal(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalContainer}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {composeModal?.mode === "edit" ? "Edit Post" : "Share Impact"}
              </Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setComposeModal(null)}>
                <Ionicons name="close" size={20} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>

            {/* Donation context pill */}
            {composeModal && (
              <View style={styles.donationContextPill}>
                <Ionicons name="heart-circle" size={16} color={COLORS.brand} />
                <Text style={styles.donationContextText} numberOfLines={1}>
                  {formatCents(composeModal.donation.amountCents, composeModal.donation.currency)}
                  {" · "}
                  {composeModal.donation.nonprofit.name}
                  {" · "}
                  {formatDate(composeModal.donation.donatedAt)}
                </Text>
              </View>
            )}

            {/* Caption input */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                value={composeCaption}
                onChangeText={setComposeCaption}
                placeholder="Write about your donation..."
                placeholderTextColor={COLORS.gray300}
                multiline
                style={styles.modalCaptionInput}
                autoFocus
              />

              {/* Allow comments toggle */}
              <View style={styles.modalToggleRow}>
                <View style={styles.modalToggleLeft}>
                  <Ionicons name="chatbubble-outline" size={16} color={COLORS.gray600} />
                  <View>
                    <Text style={styles.modalToggleLabel}>Allow comments</Text>
                    <Text style={styles.modalToggleSub}>Let others respond to this post</Text>
                  </View>
                </View>
                <Switch
                  value={composeAllowComments}
                  onValueChange={setComposeAllowComments}
                  trackColor={{ false: COLORS.gray200, true: COLORS.brandLight }}
                  thumbColor={composeAllowComments ? COLORS.brand : COLORS.gray300}
                />
              </View>
            </ScrollView>

            {/* Footer actions */}
            <View style={styles.modalFooter}>
              {composeModal?.mode === "edit" && composeModal.post && (
                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={() => handleDeletePost(
                    composeModal.donation.id,
                    composeModal.post!.id,
                    true
                  )}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                  <Text style={styles.modalDeleteBtnText}>Delete post</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  (!composeCaption.trim() || composing) && styles.modalSubmitBtnDisabled,
                ]}
                onPress={handleComposeSubmit}
                disabled={!composeCaption.trim() || composing}
              >
                {composing ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={16} color={COLORS.white} />
                    <Text style={styles.modalSubmitBtnText}>
                      {composeModal?.mode === "edit" ? "Update Post" : "Post to Feed"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 110 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  yearRow: { gap: 8, marginBottom: 16 },
  yearBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100,
    borderWidth: 1, borderColor: COLORS.gray200, backgroundColor: COLORS.white,
  },
  yearBtnActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  yearText: { fontSize: 13, fontWeight: "600", color: COLORS.gray600 },
  yearTextActive: { color: COLORS.white },

  summaryCard: {
    backgroundColor: COLORS.brand, borderRadius: 16, padding: 20, marginBottom: 16,
  },
  summaryLabel: { color: COLORS.brandLight, fontSize: 13, marginBottom: 4 },
  summaryAmount: { color: COLORS.white, fontSize: 38, fontWeight: "800", letterSpacing: -1 },
  summaryFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  summaryCount: { color: COLORS.brandLight, fontSize: 13 },
  exportBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
  },
  exportBtnText: { fontSize: 12, fontWeight: "600", color: COLORS.brandDark },

  empty: { alignItems: "center", marginTop: 48, gap: 8 },
  emptyTitle: { fontSize: 16, color: COLORS.gray500, marginTop: 8 },
  emptyLink: { fontSize: 14, color: COLORS.brand, fontWeight: "600" },

  donationCard: {
    backgroundColor: COLORS.white, borderRadius: 14, marginBottom: 8,
    overflow: "hidden", borderWidth: 1, borderColor: COLORS.gray100,
  },
  donationRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  logoFallback: { backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  logoInitial: { fontSize: 18, fontWeight: "700", color: COLORS.brandDark },
  donationInfo: { flex: 1 },
  donationOrg: { fontWeight: "700", fontSize: 14, color: COLORS.gray900 },
  donationDate: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  donationRight: { alignItems: "flex-end" },
  donationAmount: { fontWeight: "700", fontSize: 15, color: COLORS.gray900 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  receiptNum: { fontSize: 10, color: COLORS.gray400 },
  postedPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: COLORS.brandLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  postedPillText: { fontSize: 10, fontWeight: "700", color: COLORS.brand },

  // ── Expanded ──────────────────────────────────────────────────────────────

  receiptExpanded: {
    borderTopWidth: 1, borderTopColor: COLORS.gray100, padding: 14, backgroundColor: COLORS.bg,
  },
  receiptTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  receiptTitle: { fontSize: 13, fontWeight: "700", color: COLORS.gray800 },
  receiptText: { fontSize: 12, color: COLORS.gray500, lineHeight: 18 },
  receiptMeta: { flexDirection: "row", gap: 16, marginTop: 8 },
  receiptMetaText: { fontSize: 11, color: COLORS.gray500 },

  // ── Post section ──────────────────────────────────────────────────────────

  postSection: {
    borderTopWidth: 1, borderTopColor: COLORS.gray100, padding: 14,
  },
  postSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10,
  },
  postSectionLabel: {
    fontSize: 11, fontWeight: "700", color: COLORS.gray400,
    letterSpacing: 0.6, textTransform: "uppercase",
  },

  // Has a post
  postedStatusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  postedStatusText: { fontSize: 12, fontWeight: "600", color: COLORS.green },
  activePostCaption: {
    fontSize: 13, color: COLORS.gray700, lineHeight: 18, marginBottom: 6,
  },
  postMetaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  postMetaText: { fontSize: 11, color: COLORS.gray400 },
  postMetaDot: { fontSize: 11, color: COLORS.gray300 },
  postActionBtns: { flexDirection: "row", gap: 8 },
  editPostBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1.5, borderColor: COLORS.brand, backgroundColor: COLORS.brandLight,
  },
  editPostBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.brand },
  deletePostBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1.5, borderColor: "#FECDCA", backgroundColor: "#FEF3F2",
  },
  deletePostBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.red },

  // No post
  noPostHint: { fontSize: 12, color: COLORS.gray400, marginBottom: 10 },
  quickPostingLoader: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  quickPostingText: { fontSize: 13, color: COLORS.gray500 },

  quickShareGrid: { flexDirection: "row", gap: 8 },
  quickShareOption: {
    flex: 1, alignItems: "center", gap: 5,
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: COLORS.gray100,
  },
  quickShareIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },
  quickShareTitle: { fontSize: 12, fontWeight: "700", color: COLORS.gray800, textAlign: "center" },
  quickShareSub: { fontSize: 10, color: COLORS.gray400, textAlign: "center" },

  // ── Compose modal ─────────────────────────────────────────────────────────

  modalContainer: {
    flex: 1, backgroundColor: COLORS.white, paddingTop: 12,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.gray200,
    alignSelf: "center", marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: COLORS.gray900 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.gray100, alignItems: "center", justifyContent: "center",
  },
  donationContextPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 20, marginBottom: 14,
    backgroundColor: COLORS.brandLight, borderRadius: 10, padding: 10,
  },
  donationContextText: { flex: 1, fontSize: 12, fontWeight: "600", color: COLORS.brandDark },
  modalScrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  modalCaptionInput: {
    borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 14,
    padding: 14, fontSize: 15, color: COLORS.gray900,
    minHeight: 120, textAlignVertical: "top", marginBottom: 14,
  },
  modalToggleRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, gap: 12,
  },
  modalToggleLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  modalToggleLabel: { fontSize: 14, fontWeight: "600", color: COLORS.gray800 },
  modalToggleSub: { fontSize: 12, color: COLORS.gray400, marginTop: 1 },

  modalFooter: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 10,
  },
  modalDeleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#FECDCA", backgroundColor: "#FEF3F2",
  },
  modalDeleteBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.red },
  modalSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 15,
    shadowColor: COLORS.brand, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  modalSubmitBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  modalSubmitBtnText: { fontSize: 15, fontWeight: "800", color: COLORS.white },
});
