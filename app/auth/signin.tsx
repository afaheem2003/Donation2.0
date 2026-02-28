import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/lib/utils";

export default function SignInScreen() {
  const { user, signIn, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = React.useState(false);

  // Auto-close as soon as login succeeds.
  React.useEffect(() => {
    if (user) router.back();
  }, [user, router]);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signIn();
    } catch (e) {
      console.error(e);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Ionicons name="heart" size={36} color={COLORS.brand} />
      </View>

      <Text style={styles.title}>Welcome to GiveStream</Text>
      <Text style={styles.subtitle}>
        Donate to verified nonprofits, get tax receipts, and share your impact.
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
            <View style={styles.googleIconCircle}>
              <Text style={styles.googleG}>G</Text>
            </View>
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
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.gray900,
    textAlign: "center",
    marginBottom: 10,
  },
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
    borderRadius: 14,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  googleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 18,
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
