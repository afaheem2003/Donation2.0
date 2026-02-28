import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/lib/utils";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

function getValidationState(username: string): "empty" | "invalid" | "valid" {
  if (!username) return "empty";
  return USERNAME_REGEX.test(username) ? "valid" : "invalid";
}

export default function ChangeUsernameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshSession } = useAuth();

  const [username, setUsername] = useState(user?.username ?? "");
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const state = getValidationState(username);
  const unchanged = username === user?.username;
  const canSubmit = state === "valid" && !saving && !unchanged;

  function handleChange(text: string) {
    setUsername(text.replace(/\s/g, "").slice(0, 20));
    setServerError(null);
  }

  async function handleSave() {
    if (!canSubmit) return;
    setSaving(true);
    setServerError(null);
    try {
      await api.users.setUsername(username);
      await refreshSession();
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409") || msg.toLowerCase().includes("taken")) {
        setServerError("That username is already taken.");
      } else if (msg.includes("400") || msg.toLowerCase().includes("invalid")) {
        setServerError("Username must be 3–20 characters: letters, numbers, underscores only.");
      } else {
        Alert.alert("Error", "Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const showError = state === "invalid" || !!serverError;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.white }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.gray700} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Username</Text>
        <TouchableOpacity
          style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSubmit}
        >
          {saving
            ? <ActivityIndicator size="small" color={COLORS.white} />
            : <Text style={styles.saveBtnText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.label}>Username</Text>

        <View style={[
          styles.inputWrap,
          state === "valid" && !unchanged && styles.inputWrapValid,
          showError && styles.inputWrapError,
        ]}>
          <Text style={styles.atSign}>@</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={handleChange}
            placeholder="yourname"
            placeholderTextColor={COLORS.gray300}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          {state === "valid" && !unchanged && !serverError && (
            <Ionicons name="checkmark-circle" size={20} color={COLORS.green} />
          )}
        </View>

        {showError ? (
          <Text style={styles.errorText}>
            {serverError ?? "3–20 characters: letters, numbers, underscores only."}
          </Text>
        ) : unchanged ? (
          <Text style={styles.hintText}>Enter a new username to change it</Text>
        ) : (
          <Text style={styles.hintText}>3–20 characters · letters, numbers, underscores</Text>
        )}

        <Text style={styles.note}>
          Your profile link will change to <Text style={styles.noteHandle}>@{username || "username"}</Text>. Links using your old username will no longer work.
        </Text>
      </View>
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
  backBtn: { paddingVertical: 4, paddingHorizontal: 4, minWidth: 48 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: COLORS.gray900 },
  saveBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 8, paddingHorizontal: 18,
    borderRadius: 20, minWidth: 60, alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { fontSize: 14, fontWeight: "800", color: COLORS.white },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  label: {
    fontSize: 12, fontWeight: "700", color: COLORS.gray500,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
  },

  // Input
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: COLORS.gray200,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  inputWrapValid: { borderColor: COLORS.green },
  inputWrapError: { borderColor: COLORS.red },
  atSign: {
    fontSize: 18, fontWeight: "700", color: COLORS.gray400, marginRight: 6,
  },
  input: {
    flex: 1, fontSize: 18, fontWeight: "600", color: COLORS.gray900,
  },

  // Hints
  hintText: { fontSize: 12, color: COLORS.gray400, marginBottom: 24 },
  errorText: { fontSize: 12, color: COLORS.red, marginBottom: 24 },

  // Note
  note: {
    fontSize: 13, color: COLORS.gray400, lineHeight: 19,
    backgroundColor: COLORS.bg,
    padding: 14, borderRadius: 12,
  },
  noteHandle: { color: COLORS.gray700, fontWeight: "700" },
});
