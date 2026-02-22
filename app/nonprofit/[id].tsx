import React, { useEffect, useState } from "react";
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking, Alert,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { api, Nonprofit } from "@/lib/api";
import { formatCents, COLORS } from "@/lib/utils";
import { DonateSheet } from "@/components/DonateSheet";

export default function NonprofitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [nonprofit, setNonprofit] = useState<Nonprofit | null>(null);
  const [loading, setLoading] = useState(true);
  const [donateVisible, setDonateVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.nonprofits
      .get(id)
      .then((data) => {
        setNonprofit(data);
        navigation.setOptions({ title: data.name });
      })
      .catch(() => Alert.alert("Error", "Could not load nonprofit"))
      .finally(() => setLoading(false));
  }, [id, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brand} size="large" />
      </View>
    );
  }

  if (!nonprofit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Nonprofit not found.</Text>
      </View>
    );
  }

  const categoryLabel = nonprofit.category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.coverGradient} />
          <View style={styles.logoContainer}>
            {nonprofit.logoUrl ? (
              <Image source={{ uri: nonprofit.logoUrl }} style={styles.logo} />
            ) : (
              <View style={[styles.logo, styles.logoFallback]}>
                <Text style={{ fontSize: 36 }}>🤝</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{nonprofit.name}</Text>
            {nonprofit.verified && <Text style={styles.verified}>✓ Verified</Text>}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.category}>{categoryLabel}</Text>
            <Text style={styles.ein}>EIN: {nonprofit.ein}</Text>
          </View>

          {nonprofit.website && (
            <TouchableOpacity
              onPress={() => Linking.openURL(nonprofit.website!)}
              style={styles.websiteRow}
            >
              <Text style={styles.websiteText}>🌐 {nonprofit.website.replace(/^https?:\/\//, "")}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.description}>{nonprofit.description}</Text>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {formatCents(nonprofit.totalRaisedCents ?? 0)}
              </Text>
              <Text style={styles.statLabel}>Total raised</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {nonprofit._count?.donations.toLocaleString() ?? "0"}
              </Text>
              <Text style={styles.statLabel}>Donations</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {nonprofit._count?.posts.toLocaleString() ?? "0"}
              </Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Donate button */}
      <View style={styles.donateBar}>
        <TouchableOpacity
          style={styles.donateBtn}
          onPress={() => setDonateVisible(true)}
        >
          <Text style={styles.donateBtnText}>💚 Donate</Text>
        </TouchableOpacity>
      </View>

      <DonateSheet
        visible={donateVisible}
        nonprofitId={nonprofit.id}
        nonprofitName={nonprofit.name}
        onClose={() => setDonateVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { paddingBottom: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: COLORS.gray500, fontSize: 16 },
  header: { height: 120, backgroundColor: COLORS.brandLight, position: "relative" },
  coverGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.brandLight },
  logoContainer: { position: "absolute", bottom: -30, left: 20 },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  logoFallback: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { paddingHorizontal: 20, paddingTop: 44 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  name: { fontSize: 22, fontWeight: "800", color: COLORS.gray900, flex: 1 },
  verified: {
    fontSize: 12,
    color: COLORS.brand,
    fontWeight: "600",
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  category: {
    fontSize: 12,
    color: COLORS.gray500,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  ein: { fontSize: 12, color: COLORS.gray400 },
  websiteRow: { marginBottom: 14 },
  websiteText: { fontSize: 13, color: COLORS.brand },
  description: { fontSize: 14, color: COLORS.gray600, lineHeight: 22, marginBottom: 24 },
  stats: {
    flexDirection: "row",
    backgroundColor: COLORS.gray50,
    borderRadius: 14,
    padding: 16,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: COLORS.gray900 },
  statLabel: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.gray200 },
  donateBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    padding: 16,
    paddingBottom: 34,
  },
  donateBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: "center",
  },
  donateBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 16 },
});
