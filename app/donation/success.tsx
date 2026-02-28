import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, DonationDetail } from "@/lib/api";
import { formatCents, formatDate, COLORS } from "@/lib/utils";

export default function DonationSuccessScreen() {
  const { donation_id } = useLocalSearchParams<{ donation_id: string }>();
  const router = useRouter();
  const [donation, setDonation] = useState<DonationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Share flow state
  const [shareStep, setShareStep] = useState<"choose" | "compose" | "done" | "private">("choose");
  const [caption, setCaption] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!donation_id) { setError("Invalid donation."); setLoading(false); return; }

    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const data = await api.donations.get(donation_id);
        if (data.status === "SUCCEEDED") {
          setDonation(data);
          setCaption(`Just donated ${formatCents(data.amountCents)} to ${data.nonprofit.name}!`);
          setLoading(false);
          return;
        }
      } catch {
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

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to add a picture to your post.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function sharePost() {
    if (!donation || !caption.trim()) return;
    setPosting(true);
    try {
      await api.posts.create({
        nonprofitId: donation.nonprofit.id,
        donationId: donation.id,
        caption: caption.trim(),
        // imageUrl would require an upload step — keeping URI local for now
      });
      setShareStep("done");
    } catch {
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
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.gray300} />
        <Text style={styles.errorText}>{error || "Something went wrong."}</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/tax")}>
          <Text style={styles.link}>View Tax Center</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Success banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="heart" size={28} color={COLORS.brand} />
        </View>
        <Text style={styles.bannerTitle}>Thank you!</Text>
        <Text style={styles.bannerSub}>
          Your donation of{" "}
          <Text style={styles.bannerBold}>{formatCents(donation.amountCents, donation.currency)}</Text>
          {" "}to{" "}
          <Text style={styles.bannerBold}>{donation.nonprofit.name}</Text>
          {" "}was received.
        </Text>
      </View>

      {/* Receipt */}
      {donation.receipt && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Receipt</Text>
          <Row label="Receipt #" value={donation.receipt.receiptNumber} mono />
          <Row label="Date" value={formatDate(donation.donatedAt)} />
          <Row label="Amount" value={formatCents(donation.amountCents, donation.currency)} bold />
          <Row label="EIN" value={donation.nonprofit.ein} mono />
          <Row label="Tax Year" value={String(donation.receipt.taxYear)} />
          <View style={styles.legalBox}>
            <Text style={styles.legalText}>{donation.receipt.legalText}</Text>
          </View>
        </View>
      )}

      {/* Share flow */}
      {shareStep === "choose" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Share your impact</Text>
          <Text style={styles.sectionSub}>
            Let your followers know where you gave — or keep it private.
          </Text>
          <TouchableOpacity
            style={styles.choiceBtn}
            onPress={() => setShareStep("compose")}
            activeOpacity={0.85}
          >
            <View style={styles.choiceIcon}>
              <Ionicons name="share-social-outline" size={20} color={COLORS.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>Share to feed</Text>
              <Text style={styles.choiceSub}>Post with a caption and optional photo</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.gray300} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceBtn, { marginTop: 8 }]}
            onPress={() => setShareStep("private")}
            activeOpacity={0.85}
          >
            <View style={[styles.choiceIcon, { backgroundColor: COLORS.gray100 }]}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray500} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.choiceTitle}>Keep private</Text>
              <Text style={styles.choiceSub}>Only you can see this donation</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.gray300} />
          </TouchableOpacity>
        </View>
      )}

      {shareStep === "compose" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Write your post</Text>

          {/* Photo picker */}
          <TouchableOpacity style={styles.photoPicker} onPress={pickImage} activeOpacity={0.8}>
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => setImageUri(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={22} color={COLORS.white} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={24} color={COLORS.gray400} />
                <Text style={styles.photoPlaceholderText}>Add a photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write about your donation..."
            placeholderTextColor={COLORS.gray300}
            multiline
            style={styles.captionInput}
          />

          <View style={styles.composeActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShareStep("choose")}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, (!caption.trim() || posting) && styles.shareBtnDisabled]}
              onPress={sharePost}
              disabled={!caption.trim() || posting}
              activeOpacity={0.85}
            >
              {posting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={16} color={COLORS.white} />
                  <Text style={styles.shareBtnText}>Share</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {shareStep === "done" && (
        <View style={styles.doneBanner}>
          <Ionicons name="checkmark-circle" size={22} color={COLORS.green} />
          <Text style={styles.doneText}>Shared to your feed!</Text>
        </View>
      )}

      {shareStep === "private" && (
        <View style={styles.doneBanner}>
          <Ionicons name="lock-closed" size={18} color={COLORS.gray500} />
          <Text style={[styles.doneText, { color: COLORS.gray600 }]}>Kept private</Text>
        </View>
      )}

      {/* Bottom actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionSecondary}
          onPress={() => router.push("/(tabs)/discover")}
        >
          <Text style={styles.actionSecondaryText}>Browse more</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionPrimary}
          onPress={() => router.push("/(tabs)/index")}
        >
          <Text style={styles.actionPrimaryText}>Go to feed</Text>
          <Ionicons name="arrow-forward" size={15} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Row({
  label, value, mono, bold,
}: {
  label: string; value: string; mono?: boolean; bold?: boolean;
}) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptLabel}>{label}</Text>
      <Text style={[
        styles.receiptValue,
        mono && styles.receiptMono,
        bold && styles.receiptBold,
      ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  loadingText: { color: COLORS.gray400, fontSize: 14 },
  errorText: { color: COLORS.gray600, fontSize: 15, textAlign: "center" },
  link: { color: COLORS.brand, fontSize: 14, fontWeight: "600" },

  banner: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  bannerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  bannerTitle: { color: COLORS.gray900, fontSize: 24, fontWeight: "800", marginBottom: 6 },
  bannerSub: { color: COLORS.gray500, fontSize: 14, textAlign: "center", lineHeight: 20 },
  bannerBold: { fontWeight: "700", color: COLORS.gray800 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray900, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: COLORS.gray400, marginBottom: 14 },

  receiptRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.gray50 },
  receiptLabel: { fontSize: 13, color: COLORS.gray400 },
  receiptValue: { fontSize: 13, color: COLORS.gray800 },
  receiptBold: { fontWeight: "700" },
  receiptMono: { fontFamily: "monospace", color: COLORS.gray700 },
  legalBox: { marginTop: 10, padding: 10, backgroundColor: COLORS.gray50, borderRadius: 8 },
  legalText: { fontSize: 11, color: COLORS.gray400, lineHeight: 17 },

  choiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
  },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceTitle: { fontSize: 14, fontWeight: "700", color: COLORS.gray900 },
  choiceSub: { fontSize: 12, color: COLORS.gray400, marginTop: 1 },

  photoPicker: {
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderStyle: "dashed",
  },
  photoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  photoPlaceholderText: { fontSize: 13, color: COLORS.gray400 },
  photoPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  photoRemove: { position: "absolute", top: 8, right: 8 },

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
  composeActions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 100,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: { color: COLORS.gray600, fontWeight: "600", fontSize: 14 },
  shareBtn: {
    flex: 2,
    backgroundColor: COLORS.brand,
    borderRadius: 100,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  shareBtnDisabled: { opacity: 0.45 },
  shareBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },

  doneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  doneText: { fontSize: 14, fontWeight: "600", color: COLORS.green },

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
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  actionPrimaryText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
});
