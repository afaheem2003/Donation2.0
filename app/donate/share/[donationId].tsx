import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ScrollView, ActivityIndicator, Switch, Alert, Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/lib/api";
import { COLORS, formatCents } from "@/lib/utils";

export default function ShareDonationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    donationId, nonprofitName, amountCents,
    nonprofitId, postId, postCaption, postAllowComments,
  } = useLocalSearchParams<{
    donationId: string;
    nonprofitName: string;
    amountCents: string;
    nonprofitId: string;
    postId?: string;
    postCaption?: string;
    postAllowComments?: string;
  }>();

  const isEditing = !!postId;
  const amount = parseInt(amountCents ?? "0", 10);

  const [caption, setCaption] = useState(postCaption ?? "");
  const [allowComments, setAllowComments] = useState(postAllowComments !== "false");
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled) setPhoto(res.assets[0]);
  }

  function removePhoto() {
    Alert.alert("Remove photo?", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => setPhoto(null) },
    ]);
  }

  async function handleSave() {
    if (!caption.trim()) return;
    setSaving(true);
    try {
      if (isEditing && postId) {
        await api.posts.update(postId, { caption: caption.trim(), allowComments });
      } else {
        await api.posts.create({
          nonprofitId: nonprofitId!,
          donationId: donationId!,
          caption: caption.trim(),
          imageUrl: photo?.uri,
          allowComments,
        });
      }
      router.back();
    } catch {
      Alert.alert("Error", "Could not save post. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!postId) return;
    Alert.alert("Remove post from feed?", "Your donation record stays — only the public post is removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.posts.delete(postId);
            router.back();
          } catch {
            Alert.alert("Error", "Could not remove post.");
          }
        },
      },
    ]);
  }

  const canSave = !saving;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.white }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{isEditing ? "Edit Post" : "Share Impact"}</Text>

        <TouchableOpacity
          style={[styles.postBtn, !canSave && styles.postBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          {saving
            ? <ActivityIndicator size="small" color={COLORS.white} />
            : <Text style={styles.postBtnText}>{isEditing ? "Update" : "Post"}</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Donation context pill */}
        <View style={styles.contextPill}>
          <Ionicons name="heart-circle" size={16} color={COLORS.brand} />
          <Text style={styles.contextText} numberOfLines={1}>
            {formatCents(amount)} · {nonprofitName}
          </Text>
        </View>

        {/* Visibility notice */}
        <View style={styles.visibilityBanner}>
          <Ionicons name="globe-outline" size={15} color="#6366F1" />
          <Text style={styles.visibilityText}>
            <Text style={styles.visibilityBold}>Public</Text>
            {" · This post will be visible to your followers"}
          </Text>
        </View>

        {/* ── Photo area ── */}
        {photo ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
            <View style={styles.photoOverlay}>
              <TouchableOpacity style={styles.photoOverlayBtn} onPress={pickPhoto}>
                <Ionicons name="camera" size={16} color={COLORS.white} />
                <Text style={styles.photoOverlayText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoOverlayBtn, styles.photoOverlayBtnRed]} onPress={removePhoto}>
                <Ionicons name="trash-outline" size={16} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoPlaceholder} onPress={pickPhoto} activeOpacity={0.8}>
            <View style={styles.photoPlaceholderIcon}>
              <Ionicons name="image-outline" size={30} color={COLORS.gray300} />
            </View>
            <Text style={styles.photoPlaceholderLabel}>Add a photo</Text>
            <Text style={styles.photoPlaceholderSub}>Optional</Text>
          </TouchableOpacity>
        )}

        {/* ── Caption ── */}
        <View style={styles.captionCard}>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write about your donation..."
            placeholderTextColor={COLORS.gray300}
            multiline
            style={styles.captionInput}
            autoFocus
          />
          <Text style={styles.captionCount}>{caption.length}/2200</Text>
        </View>

        {/* ── Settings ── */}
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBg}>
              <Ionicons name="chatbubble-outline" size={15} color={COLORS.gray600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Allow comments</Text>
              <Text style={styles.settingSub}>Let others respond to this post</Text>
            </View>
            <Switch
              value={allowComments}
              onValueChange={setAllowComments}
              trackColor={{ false: COLORS.gray200, true: COLORS.brandLight }}
              thumbColor={allowComments ? COLORS.brand : COLORS.gray300}
            />
          </View>
        </View>

        {/* ── Remove post (edit mode only) ── */}
        {isEditing && (
          <TouchableOpacity style={styles.removeRow} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={15} color={COLORS.red} />
            <Text style={styles.removeText}>Remove post from feed</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    backgroundColor: COLORS.white,
  },
  cancelBtn: { paddingVertical: 4, paddingHorizontal: 4, minWidth: 60 },
  cancelText: { fontSize: 16, color: COLORS.gray500, fontWeight: "500" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: COLORS.gray900 },
  postBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 8, paddingHorizontal: 18,
    borderRadius: 20, minWidth: 60, alignItems: "center",
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { fontSize: 14, fontWeight: "800", color: COLORS.white },

  // Scroll
  scroll: { paddingTop: 16, paddingHorizontal: 16, gap: 14 },

  // Donation context
  contextPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
  },
  contextText: { flex: 1, fontSize: 13, fontWeight: "600", color: COLORS.brandDark },

  // Visibility
  visibilityBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
  },
  visibilityText: { flex: 1, fontSize: 13, color: "#4338CA" },
  visibilityBold: { fontWeight: "700" },

  // Photo
  photoWrap: {
    borderRadius: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  photo: { width: "100%", aspectRatio: 4 / 3 },
  photoOverlay: {
    position: "absolute", bottom: 12, right: 12,
    flexDirection: "row", gap: 8,
  },
  photoOverlayBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
  },
  photoOverlayBtnRed: { backgroundColor: "rgba(220,38,38,0.75)" },
  photoOverlayText: { fontSize: 13, fontWeight: "700", color: COLORS.white },

  photoPlaceholder: {
    height: 160, borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.gray200, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 4,
    backgroundColor: COLORS.bg,
  },
  photoPlaceholderIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.white,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  photoPlaceholderLabel: { fontSize: 14, fontWeight: "700", color: COLORS.gray500, marginTop: 4 },
  photoPlaceholderSub: { fontSize: 12, color: COLORS.gray300 },

  // Caption
  captionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.gray100,
    padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  captionInput: {
    fontSize: 15, color: COLORS.gray900, lineHeight: 22,
    minHeight: 100, textAlignVertical: "top",
  },
  captionCount: {
    fontSize: 11, color: COLORS.gray300, textAlign: "right", marginTop: 8,
  },

  // Settings
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.gray100,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  settingRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  settingIconBg: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center",
  },
  settingLabel: { fontSize: 14, fontWeight: "600", color: COLORS.gray800 },
  settingSub: { fontSize: 12, color: COLORS.gray400, marginTop: 1 },

  // Remove
  removeRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, marginTop: 4,
  },
  removeText: { fontSize: 14, fontWeight: "600", color: COLORS.red },
});
