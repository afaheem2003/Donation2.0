import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Nonprofit } from "@/lib/api";
import { COLORS } from "@/lib/utils";

interface Props {
  nonprofit: Nonprofit;
  donationCount?: number;
}

export function NonprofitCard({ nonprofit, donationCount }: Props) {
  const router = useRouter();
  const categoryLabel = nonprofit.category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/nonprofit/${nonprofit.id}` as never)}
      activeOpacity={0.85}
    >
      {nonprofit.logoUrl ? (
        <Image source={{ uri: nonprofit.logoUrl }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.logoFallback]}>
          <Text style={{ fontSize: 22 }}>🤝</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{nonprofit.name}</Text>
          {nonprofit.verified && <Text style={styles.verified}>✓</Text>}
        </View>
        <Text style={styles.category}>{categoryLabel}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {nonprofit.description}
        </Text>
        {!!donationCount && donationCount > 0 && (
          <Text style={styles.donationCount}>
            💚 {donationCount.toLocaleString()} donations
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  logo: { width: 52, height: 52, borderRadius: 12 },
  logoFallback: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
  name: { fontWeight: "700", fontSize: 14, color: COLORS.gray900, flex: 1 },
  verified: { fontSize: 13, color: COLORS.brand },
  category: {
    fontSize: 11,
    color: COLORS.gray500,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  description: { fontSize: 12, color: COLORS.gray500, lineHeight: 17 },
  donationCount: { fontSize: 11, color: COLORS.gray400, marginTop: 4 },
});
