import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, Nonprofit } from "@/lib/api";
import { COLORS } from "@/lib/utils";

const CAT_COLOR: Record<string, string> = {
  EDUCATION:      "#4A90E2",
  HEALTH:         "#F04438",
  ENVIRONMENT:    "#12B76A",
  ARTS:           "#9B4AE2",
  HUMAN_SERVICES: "#FF9500",
  ANIMALS:        "#F59E0B",
  INTERNATIONAL:  "#007AFF",
  RELIGION:       "#8E8E93",
  COMMUNITY:      COLORS.brand,
  OTHER:          COLORS.gray300,
};

const CAT_LABEL: Record<string, string> = {
  EDUCATION: "Education", HEALTH: "Health", ENVIRONMENT: "Planet",
  ARTS: "Arts", HUMAN_SERVICES: "Services", ANIMALS: "Animals",
  INTERNATIONAL: "Global", RELIGION: "Religion", COMMUNITY: "Community", OTHER: "Other",
};

// ─── Smart client-side search scoring ────────────────────────────────────────

function scoreOrg(org: Nonprofit, rawQuery: string): number {
  if (!rawQuery) return 1;
  const q = rawQuery.toLowerCase().trim();
  const name = org.name.toLowerCase();
  const catLabel = (CAT_LABEL[org.category] ?? org.category).toLowerCase();
  const desc = org.description?.toLowerCase() ?? "";

  if (name === q) return 1000;
  if (name.startsWith(q)) return 850;
  const words = name.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 700;
  if (name.includes(q)) return 500;
  if (catLabel.includes(q)) return 300;
  if (org.ein?.includes(q)) return 250;
  if (desc.includes(q)) return 150;

  // Fuzzy: all query chars appear in order in the name
  let qi = 0;
  for (let i = 0; i < name.length && qi < q.length; i++) {
    if (name[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 50 + (50 * q.length) / name.length;

  return 0;
}

function filterAndSort(all: Nonprofit[], query: string): Nonprofit[] {
  if (!query.trim()) return all;
  return all
    .map((o) => ({ o, score: scoreOrg(o, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ o }) => o);
}

// ─── Org avatar ───────────────────────────────────────────────────────────────

function OrgAvatar({ org }: { org: Nonprofit }) {
  const color = CAT_COLOR[org.category] ?? COLORS.brand;
  if (org.logoUrl) {
    return <Image source={{ uri: org.logoUrl }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, { backgroundColor: color + "1A" }]}>
      <Text style={[styles.avatarInitial, { color }]}>
        {org.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Org card ─────────────────────────────────────────────────────────────────

function OrgCard({ org }: { org: Nonprofit }) {
  const router = useRouter();
  const color = CAT_COLOR[org.category] ?? COLORS.brand;
  const label = CAT_LABEL[org.category] ?? org.category;
  const donors = org._count?.donations ?? 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/donate/${org.id}`)}
      activeOpacity={0.65}
    >
      {/* Left color accent */}
      <View style={[styles.cardAccent, { backgroundColor: color }]} />

      <OrgAvatar org={org} />

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{org.name}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.catDot, { backgroundColor: color }]} />
          <Text style={styles.catText}>{label}</Text>
          {donors > 0 && (
            <>
              <View style={styles.metaSep} />
              <Ionicons name="heart-outline" size={10} color={COLORS.gray400} />
              <Text style={styles.donorText}>{donors.toLocaleString()}</Text>
            </>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={COLORS.gray200} />
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DonateSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [allOrgs, setAllOrgs] = useState<Nonprofit[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all orgs once on mount (fetch first 2 pages concurrently)
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.nonprofits.list({ page: 1 }),
      api.nonprofits.list({ page: 2 }),
    ])
      .then(([p1, p2]) => {
        if (!cancelled) {
          const seen = new Set<string>();
          const merged: Nonprofit[] = [];
          for (const o of [...p1.nonprofits, ...p2.nonprofits]) {
            if (!seen.has(o.id)) { seen.add(o.id); merged.push(o); }
          }
          setAllOrgs(merged);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const hasQuery = query.trim().length > 0;
  const results = hasQuery ? filterAndSort(allOrgs, query) : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Where to donate?</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
          <Ionicons name="close" size={18} color={COLORS.gray600} />
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
      >
        <Ionicons
          name="search"
          size={17}
          color={query ? COLORS.brand : COLORS.gray400}
        />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search organizations..."
          placeholderTextColor={COLORS.gray300}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {loading && <ActivityIndicator size="small" color={COLORS.brand} />}
      </TouchableOpacity>

      {/* ── Results / idle state ── */}
      {!hasQuery ? (
        <View style={styles.idleState}>
          <View style={styles.idleIconWrap}>
            <Ionicons name="search-outline" size={32} color={COLORS.brand} />
          </View>
          <Text style={styles.idleTitle}>Find an organization</Text>
          <Text style={styles.idleSub}>
            Search by name or EIN to find{"\n"}a cause you care about
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(o) => o.id}
          renderItem={({ item }) => <OrgCard org={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="sad-outline" size={36} color={COLORS.gray200} />
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptySub}>Try a different search term</Text>
              </View>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.gray900,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === "ios" ? 13 : 9,
    gap: 9,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: COLORS.gray100,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.gray900,
    padding: 0,
    fontWeight: "500",
  },

  // List
  listContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginLeft: 70,
  },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    backgroundColor: COLORS.white,
  },
  cardAccent: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    fontSize: 19,
    fontWeight: "800",
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.gray500,
  },
  metaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.gray300,
  },
  donorText: {
    fontSize: 12,
    color: COLORS.gray400,
    fontWeight: "500",
  },

  // Idle state (white, before any search)
  idleState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
    paddingBottom: 80,
  },
  idleIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  idleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gray800,
  },
  idleSub: {
    fontSize: 14,
    color: COLORS.gray400,
    textAlign: "center",
    lineHeight: 20,
  },

  // Empty results
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.gray700,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.gray400,
  },
});
