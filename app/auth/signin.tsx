import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/lib/utils";

export default function SignInScreen() {
  const { signIn, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = React.useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signIn();
      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>💚</Text>
      <Text style={styles.title}>Welcome to GiveStream</Text>
      <Text style={styles.subtitle}>
        Sign in to donate to nonprofits, track your tax receipts, and share your impact.
      </Text>

      <TouchableOpacity
        style={styles.googleBtn}
        onPress={handleSignIn}
        disabled={signingIn || loading}
      >
        {signingIn ? (
          <ActivityIndicator color={COLORS.gray700} />
        ) : (
          <>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Maybe later</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: COLORS.white,
  },
  logo: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.gray900, textAlign: "center", marginBottom: 10 },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray500,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 100,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },
  googleIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#4285F4",
    textAlign: "center",
    lineHeight: 22,
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 13,
  },
  googleBtnText: { fontSize: 16, fontWeight: "600", color: COLORS.gray700 },
  cancelBtn: { paddingVertical: 14 },
  cancelText: { color: COLORS.gray400, fontSize: 15 },
  disclaimer: {
    position: "absolute",
    bottom: 40,
    fontSize: 11,
    color: COLORS.gray300,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
