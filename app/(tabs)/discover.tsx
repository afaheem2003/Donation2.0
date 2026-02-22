import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, ScrollView,
} from "react-native";
import { NonprofitCard } from "@/components/NonprofitCard";
import { api, Nonprofit } from "@/lib/api";
import { COLORS } from "@/lib/utils";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "EDUCATION", label: "Education" },
  { key: "HEALTH", label: "Health" },
  { key: "ENVIRONMENT", label: "Environment" },
  { key: "ARTS", label: "Arts" },
  { key: "HUMAN_SERVICES", label: "Human Services" },
  { key: "ANIMALS", label: "Animals" },
  { key: "INTERNATIONAL", label: "International" },
  { key: "COMMUNITY", label: "Community" },
  { key: "OTHER", label: "Other" },
];

export default function DiscoverScreen() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [nonprofits, setNonprofits] = useState<Nonprofit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    api.nonprofits
      .list({ search: query || undefined, category: category || undefined })
      .then((data) => {
        setNonprofits(data.nonprofits);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [query, category]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search nonprofits..."
          placeholderTextColor={COLORS.gray400}
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.chip, category === c.key && styles.chipActive]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={nonprofits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NonprofitCard nonprofit={item} donationCount={item._count?.donations} />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.totalText}>{total} nonprofits</Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySub}>Try a different search or category</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    margin: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: COLORS.gray900 },
  chips: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontSize: 13, color: COLORS.gray600, fontWeight: "600" },
  chipTextActive: { color: COLORS.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  totalText: { fontSize: 12, color: COLORS.gray400, marginBottom: 8 },
  empty: { alignItems: "center", marginTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray600 },
  emptySub: { fontSize: 13, color: COLORS.gray400, marginTop: 4 },
});
