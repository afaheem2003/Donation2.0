import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, DonationDetail } from "@/lib/api";
import { formatCents, formatDate, COLORS } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function DonationSuccessScreen() {
  const { donation_id } = useLocalSearchParams<{ donation_id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [donation, setDonation] = useState<DonationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    if (!donation_id) { setError("Invalid donation."); setLoading(false); return; }

    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const data = await api.donations.get(donation_id);
        if (data.status === "SUCCEEDED") {
          setDonation(data);
          setCaption(`Just donated ${formatCents(data.amountCents)} to ${data.nonprofit.name}! 💚`);
          setLoading(false);
          return;
        }
      } catch (e) {
        // not ready yet
      }
      if (attempts < 10) setTimeout(poll, 1500);
      else {
        setError("Donation is being processed. Check your Tax Center.");
        setLoading(false);
      }
    };
    poll();
  }, [donation_id]);

  async function sharePost() {
    if (!donation || !caption.trim()) return;
    setPosting(true);
    try {
      await api.posts.create({
        nonprofitId: donation.nonprofit.id,
        donationId: donation.id,
        caption: caption.trim(),
      });
      setPosted(true);
    } catch (e) {
      Alert.alert("Error", "Could not share post.");
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brand} size="large" />
        <Text style={styles.loadingText}>Confirming your donation...</Text>
      </View>
    );
  }

  if (error || !donation) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Something went wrong."}</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/tax")}>
          <Text style={styles.link}>View Tax Center →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Success banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🎉</Text>
        <Text style={styles.bannerTitle}>Thank you!</Text>
        <Text style={styles.bannerSub}>
          Your donation of{" "}
          <Text style={styles.bannerBold}>{formatCents(donation.amountCents, donation.currency)}</Text>{" "}
          to{" "}
          <Text style={styles.bannerBold}>{donation.nonprofit.name}</Text>{" "}
          was received.
        </Text>
      </View>

      {/* Receipt */}
      {donation.receipt && (
        <View style={styles.receiptCard}>
          <Text style={styles.sectionTitle}>Donation Receipt</Text>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Receipt #</Text>
            <Text style={styles.receiptMono}>{donation.receipt.receiptNumber}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Date</Text>
            <Text style={styles.receiptValue}>{formatDate(donation.donatedAt)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Amount</Text>
            <Text style={[styles.receiptValue, styles.receiptBold]}>
              {formatCents(donation.amountCents, donation.currency)}
            </Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>EIN</Text>
            <Text style={styles.receiptMono}>{donation.nonprofit.ein}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Tax Year</Text>
            <Text style={styles.receiptValue}>{donation.receipt.taxYear}</Text>
          </View>
          <View style={styles.legalTextBox}>
            <Text style={styles.legalText}>{donation.receipt.legalText}</Text>
          </View>
        </View>
      )}

      {/* Share post */}
      {!posted ? (
        <View style={styles.shareCard}>
          <Text style={styles.sectionTitle}>Share your impact 📣</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write about your donation..."
            placeholderTextColor={COLORS.gray300}
            multiline
            numberOfLines={3}
            style={styles.captionInput}
          />
          <TouchableOpacity
            style={[styles.shareBtn, (!caption.trim() || posting) && styles.shareBtnDisabled]}
            onPress={sharePost}
            disabled={!caption.trim() || posting}
          >
            {posting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.shareBtnText}>Share to feed</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.postedBanner}>
          <Text style={styles.postedText}>✅ Your post was shared to the feed!</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionSecondary} onPress={() => router.push("/(tabs)/discover")}>
          <Text style={styles.actionSecondaryText}>Browse more</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionPrimary} onPress={() => router.push("/(tabs)/index")}>
          <Text style={styles.actionPrimaryText}>Go to feed →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: COLORS.gray400, fontSize: 14 },
  errorText: { color: COLORS.gray600, fontSize: 15, textAlign: "center" },
  link: { color: COLORS.brand, fontSize: 14, fontWeight: "600" },
  banner: {
    backgroundColor: COLORS.brand,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  bannerEmoji: { fontSize: 48, marginBottom: 8 },
  bannerTitle: { color: COLORS.white, fontSize: 26, fontWeight: "800", marginBottom: 6 },
  bannerSub: { color: "#fce7f3", fontSize: 14, textAlign: "center", lineHeight: 20 },
  bannerBold: { fontWeight: "700", color: COLORS.white },
  receiptCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray900, marginBottom: 12 },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  receiptLabel: { fontSize: 13, color: COLORS.gray400 },
  receiptValue: { fontSize: 13, color: COLORS.gray800 },
  receiptBold: { fontWeight: "700" },
  receiptMono: { fontSize: 13, color: COLORS.gray700, fontFamily: "monospace" },
  legalTextBox: { marginTop: 10, padding: 10, backgroundColor: COLORS.gray50, borderRadius: 8 },
  legalText: { fontSize: 11, color: COLORS.gray400, lineHeight: 17 },
  shareCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.gray900,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  shareBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: "center",
  },
  shareBtnDisabled: { opacity: 0.5 },
  shareBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  postedBanner: {
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  postedText: { color: "#166534", fontWeight: "600", fontSize: 14 },
  actions: { flexDirection: "row", gap: 10 },
  actionSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  actionSecondaryText: { color: COLORS.gray600, fontWeight: "600", fontSize: 14 },
  actionPrimary: {
    flex: 1,
    backgroundColor: COLORS.brand,
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionPrimaryText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
});
