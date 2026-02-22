import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, Modal, Alert, ActivityIndicator, Linking,
} from "react-native";
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

        <View style={styles.header}>
          <View style={styles.icon}>
            <Text style={{ fontSize: 20 }}>💚</Text>
          </View>
          <View>
            <Text style={styles.donatingTo}>Donating to</Text>
            <Text style={styles.nonprofitName}>{nonprofitName}</Text>
          </View>
        </View>

        {/* Preset amounts */}
        <Text style={styles.sectionLabel}>Choose an amount</Text>
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
        <Text style={styles.sectionLabel}>Or enter custom amount</Text>
        <View style={styles.inputRow}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            value={customAmount}
            onChangeText={(v) => { setCustomAmount(v); setSelectedAmount(0); }}
            placeholder="0.00"
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

        <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Secure payment via Stripe · Tax-deductible receipt sent
        </Text>
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
    width: 40,
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
    marginBottom: 28,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  donatingTo: { fontSize: 12, color: COLORS.gray400 },
  nonprofitName: { fontSize: 17, fontWeight: "700", color: COLORS.gray900 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray600,
    marginBottom: 10,
  },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  presetBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: COLORS.gray200,
  },
  presetBtnActive: { borderColor: COLORS.brand, backgroundColor: COLORS.brandLight },
  presetLabel: { fontSize: 15, fontWeight: "600", color: COLORS.gray700 },
  presetLabelActive: { color: COLORS.brandDark },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 28,
  },
  dollarSign: { fontSize: 18, color: COLORS.gray500, marginRight: 4 },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 12,
    color: COLORS.gray900,
  },
  donateBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  donateBtnDisabled: { opacity: 0.5 },
  donateBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { color: COLORS.gray500, fontSize: 15 },
  disclaimer: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 8,
  },
});
