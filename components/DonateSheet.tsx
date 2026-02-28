import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert, ActivityIndicator, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "expo-router";

const PRESET_AMOUNTS = [10, 25, 50, 100, 250];

interface Props {
  visible: boolean;
  nonprofitId: string;
  nonprofitName: string;
  onClose: () => void;
}

export function DonateSheet({ visible, nonprofitId, nonprofitName, onClose }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const finalAmount = customAmount ? parseFloat(customAmount) : selectedAmount;
  const amountCents = Math.round(finalAmount * 100);

  async function handleDonate() {
    if (!user) {
      onClose();
      router.push("/auth/signin");
      return;
    }
    if (amountCents < 100) {
      Alert.alert("Minimum donation is $1.00");
      return;
    }
    setLoading(true);
    try {
      const { url } = await api.stripe.createCheckoutSession(nonprofitId, amountCents);
      await Linking.openURL(url);
      onClose();
    } catch (e) {
      Alert.alert("Error", (e as Error).message ?? "Could not start checkout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="heart" size={22} color={COLORS.brand} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.donatingTo}>Donating to</Text>
            <Text style={styles.nonprofitName} numberOfLines={1}>{nonprofitName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={COLORS.gray500} />
          </TouchableOpacity>
        </View>

        {/* Amount display */}
        <View style={styles.amountDisplay}>
          <Text style={styles.amountValue}>
            ${customAmount || selectedAmount.toString()}
          </Text>
        </View>

        {/* Preset amounts */}
        <View style={styles.presetGrid}>
          {PRESET_AMOUNTS.map((amt) => (
            <TouchableOpacity
              key={amt}
              style={[
                styles.presetBtn,
                selectedAmount === amt && !customAmount && styles.presetBtnActive,
              ]}
              onPress={() => { setSelectedAmount(amt); setCustomAmount(""); }}
            >
              <Text
                style={[
                  styles.presetLabel,
                  selectedAmount === amt && !customAmount && styles.presetLabelActive,
                ]}
              >
                ${amt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom amount */}
        <View style={styles.inputRow}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            value={customAmount}
            onChangeText={(v) => { setCustomAmount(v); setSelectedAmount(0); }}
            placeholder="Custom amount"
            placeholderTextColor={COLORS.gray300}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>

        {/* Donate button */}
        <TouchableOpacity
          style={[styles.donateBtn, (loading || amountCents < 100) && styles.donateBtnDisabled]}
          onPress={handleDonate}
          disabled={loading || amountCents < 100}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.donateBtnText}>
              {user ? `Donate $${(amountCents / 100).toFixed(2)}` : "Sign in to donate"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.disclaimerRow}>
          <Ionicons name="lock-closed" size={12} color={COLORS.gray400} />
          <Text style={styles.disclaimer}>Secure via Stripe · Tax receipt sent automatically</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.gray200,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  donatingTo: { fontSize: 12, color: COLORS.gray400 },
  nonprofitName: { fontSize: 16, fontWeight: "700", color: COLORS.gray900 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  amountDisplay: {
    alignItems: "center",
    marginBottom: 24,
  },
  amountValue: {
    fontSize: 48,
    fontWeight: "800",
    color: COLORS.gray900,
    letterSpacing: -1,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    justifyContent: "center",
  },
  presetBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  presetBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandLight },
  presetLabel: { fontSize: 15, fontWeight: "600", color: COLORS.gray700 },
  presetLabelActive: { color: COLORS.brandDark },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  dollarSign: { fontSize: 18, color: COLORS.gray400, marginRight: 4 },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 12,
    color: COLORS.gray900,
  },
  donateBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  donateBtnDisabled: { opacity: 0.45 },
  donateBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
  disclaimerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  disclaimer: { fontSize: 12, color: COLORS.gray400 },
});
