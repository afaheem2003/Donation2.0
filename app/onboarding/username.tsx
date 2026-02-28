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

export default function UsernameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshSession } = useAuth();

  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const state = getValidationState(username);
  const canSubmit = state === "valid" && !saving;

  function handleChange(text: string) {
    // Strip spaces and limit to 20 chars
    setUsername(text.replace(/\s/g, "").slice(0, 20));
    setServerError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setServerError(null);
    try {
      await api.users.setUsername(username);
      await refreshSession();
      router.replace("/(tabs)");
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

  const showHint = state === "invalid" || !!serverError;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.white }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>

        {/* Logo area */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBg}>
            <Ionicons name="heart" size={32} color={COLORS.white} />
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Welcome to GiveStream</Text>
        <Text style={styles.subheading}>Choose a username so friends can find and follow you.</Text>

        {/* Input */}
        <View style={[
          styles.inputWrap,
          state === "valid" && styles.inputWrapValid,
          (state === "invalid" || !!serverError) && styles.inputWrapError,
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
            onSubmitEditing={handleSubmit}
          />
          {state === "valid" && !serverError && (
            <Ionicons name="checkmark-circle" size={20} color={COLORS.green} />
          )}
        </View>

        {/* Hint / error */}
        {showHint ? (
          <Text style={styles.errorText}>
            {serverError ?? "3–20 characters: letters, numbers, underscores only."}
          </Text>
        ) : (
          <Text style={styles.hintText}>3–20 characters · letters, numbers, underscores</Text>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color={COLORS.white} />
            : <Text style={styles.btnText}>Continue</Text>
          }
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
  },

  // Logo
  logoWrap: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBg: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: COLORS.brand,
    alignItems: "center", justifyContent: "center",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  // Text
  heading: {
    fontSize: 26, fontWeight: "800", color: COLORS.gray900,
    textAlign: "center", marginBottom: 8,
  },
  subheading: {
    fontSize: 15, color: COLORS.gray500, textAlign: "center",
    lineHeight: 22, marginBottom: 36,
  },

  // Input
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: COLORS.gray200,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  inputWrapValid: {
    borderColor: COLORS.green,
  },
  inputWrapError: {
    borderColor: COLORS.red,
  },
  atSign: {
    fontSize: 18, fontWeight: "700", color: COLORS.gray400, marginRight: 6,
  },
  input: {
    flex: 1, fontSize: 18, fontWeight: "600", color: COLORS.gray900,
  },

  // Hints
  hintText: {
    fontSize: 12, color: COLORS.gray400, marginBottom: 32,
  },
  errorText: {
    fontSize: 12, color: COLORS.red, marginBottom: 32,
  },

  // Button
  btn: {
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    backgroundColor: COLORS.gray200,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    fontSize: 16, fontWeight: "800", color: COLORS.white,
  },
});
