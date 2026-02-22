import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, Alert, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { api, TaxDonation } from "@/lib/api";
import { formatCents, formatDate, COLORS } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function TaxScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [donations, setDonations] = useState<TaxDonation[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/auth/signin"); return; }
    setLoading(true);
    api.tax
      .summary(year)
      .then((data) => { setDonations(data.donations); setTotalCents(data.totalCents); })
      .catch(() => Alert.alert("Error", "Could not load tax data"))
      .finally(() => setLoading(false));
  }, [year, user, authLoading, router]);

  function handleExport() {
    const url = api.tax.exportCsvUrl(year);
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open export URL"));
  }

  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.brand} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Tax Center</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Text style={styles.exportBtnText}>⬇ Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Year picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
        {YEARS.map((y) => (
          <TouchableOpacity
            key={y}
            style={[styles.yearBtn, year === y && styles.yearBtnActive]}
            onPress={() => setYear(y)}
          >
            <Text style={[styles.yearText, year === y && styles.yearTextActive]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total donated in {year}</Text>
        <Text style={styles.summaryAmount}>{formatCents(totalCents)}</Text>
        <Text style={styles.summaryCount}>{donations.length} donation{donations.length !== 1 ? "s" : ""}</Text>
      </View>

      {/* Donation list */}
      {donations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No donations in {year}</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/discover")}>
            <Text style={styles.emptyLink}>Find nonprofits to support →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        donations.map((d) => (
          <View key={d.id} style={styles.donationCard}>
            <TouchableOpacity
              style={styles.donationRow}
              onPress={() => setExpanded(expanded === d.id ? null : d.id)}
            >
              {d.nonprofit.logoUrl ? (
                <Image source={{ uri: d.nonprofit.logoUrl }} style={styles.logo} />
              ) : (
                <View style={[styles.logo, styles.logoFallback]}>
                  <Text>🤝</Text>
                </View>
              )}
              <View style={styles.donationInfo}>
                <Text style={styles.donationOrg}>{d.nonprofit.name}</Text>
                <Text style={styles.donationDate}>{formatDate(d.donatedAt)}</Text>
              </View>
              <View style={styles.donationRight}>
                <Text style={styles.donationAmount}>{formatCents(d.amountCents, d.currency)}</Text>
                {d.receipt && (
                  <Text style={styles.receiptNum}>{d.receipt.receiptNumber}</Text>
                )}
              </View>
            </TouchableOpacity>

            {expanded === d.id && d.receipt && (
              <View style={styles.receiptExpanded}>
                <Text style={styles.receiptTitle}>📄 Tax Receipt</Text>
                <Text style={styles.receiptText}>{d.receipt.legalText}</Text>
                <View style={styles.receiptMeta}>
                  <Text style={styles.receiptMetaText}>EIN: {d.nonprofit.ein}</Text>
                  <Text style={styles.receiptMetaText}>Tax Year: {d.receipt.taxYear}</Text>
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.gray900 },
  exportBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
  },
  exportBtnText: { fontSize: 12, fontWeight: "600", color: COLORS.gray700 },
  yearRow: { gap: 8, marginBottom: 16 },
  yearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  yearBtnActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  yearText: { fontSize: 13, fontWeight: "600", color: COLORS.gray600 },
  yearTextActive: { color: COLORS.white },
  summaryCard: {
    backgroundColor: COLORS.brand,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryLabel: { color: "#fce7f3", fontSize: 13, marginBottom: 4 },
  summaryAmount: { color: COLORS.white, fontSize: 36, fontWeight: "800" },
  summaryCount: { color: "#fce7f3", fontSize: 13, marginTop: 2 },
  empty: { alignItems: "center", marginTop: 40 },
  emptyTitle: { fontSize: 16, color: COLORS.gray500, marginBottom: 8 },
  emptyLink: { fontSize: 14, color: COLORS.brand, fontWeight: "600" },
  donationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  donationRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  logoFallback: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  donationInfo: { flex: 1 },
  donationOrg: { fontWeight: "700", fontSize: 14, color: COLORS.gray900 },
  donationDate: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  donationRight: { alignItems: "flex-end" },
  donationAmount: { fontWeight: "700", fontSize: 15, color: COLORS.gray900 },
  receiptNum: { fontSize: 10, color: COLORS.gray400, fontFamily: "monospace" },
  receiptExpanded: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    padding: 14,
    backgroundColor: COLORS.gray50,
  },
  receiptTitle: { fontSize: 13, fontWeight: "700", color: COLORS.gray800, marginBottom: 6 },
  receiptText: { fontSize: 12, color: COLORS.gray500, lineHeight: 18 },
  receiptMeta: { flexDirection: "row", gap: 16, marginTop: 8 },
  receiptMetaText: { fontSize: 11, color: COLORS.gray500 },
});
