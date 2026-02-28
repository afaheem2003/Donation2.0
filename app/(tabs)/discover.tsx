import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, FlatList, StyleSheet, Image,
  ActivityIndicator, TouchableOpacity, ScrollView, Keyboard,
  RefreshControl,
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { NonprofitCard } from "@/components/NonprofitCard";
import { api, Nonprofit, UserSearchResult } from "@/lib/api";
import { COLORS } from "@/lib/utils";

const CATEGORIES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "", label: "All", icon: "apps" },
  { key: "EDUCATION", label: "Education", icon: "school" },
  { key: "HEALTH", label: "Health", icon: "medkit" },
  { key: "ENVIRONMENT", label: "Environment", icon: "leaf" },
  { key: "ARTS", label: "Arts", icon: "color-palette" },
  { key: "HUMAN_SERVICES", label: "People", icon: "people" },
  { key: "ANIMALS", label: "Animals", icon: "paw" },
  { key: "INTERNATIONAL", label: "Global", icon: "globe" },
  { key: "COMMUNITY", label: "Community", icon: "home" },
  { key: "OTHER", label: "Other", icon: "ellipsis-horizontal" },
];

const NEARBY_DELTA = 1.2;
const US_FALLBACK: Region = {
  latitude: 38.5,
  longitude: -96,
  latitudeDelta: 30,
  longitudeDelta: 40,
};

// How closely does `str` match `q`? Higher = better.
function relevanceScore(str: string | null | undefined, q: string): number {
  if (!str || !q) return 0;
  const s = str.toLowerCase();
  const lq = q.toLowerCase();
  if (s === lq) return 4;
  if (s.startsWith(lq)) return 3;
  if (s.includes(lq)) return 2;
  return 0;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const searchRef = useRef<TextInput>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  // Nonprofit results
  const [nonprofits, setNonprofits] = useState<Nonprofit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User search results
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [userSearching, setUserSearching] = useState(false);

  // Map state
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<Nonprofit | null>(null);
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const currentRegion = useRef<Region>(US_FALLBACK);

  function zoom(direction: "in" | "out") {
    const factor = direction === "in" ? 0.5 : 2;
    const next: Region = {
      ...currentRegion.current,
      latitudeDelta: Math.min(Math.max(currentRegion.current.latitudeDelta * factor, 0.005), 120),
      longitudeDelta: Math.min(Math.max(currentRegion.current.longitudeDelta * factor, 0.005), 120),
    };
    mapRef.current?.animateToRegion(next, 250);
    currentRegion.current = next;
  }

  // Debounce: search → query
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch nonprofits whenever query or category changes
  const fetchNonprofits = useCallback(async () => {
    try {
      const data = await api.nonprofits.list({
        search: query || undefined,
        category: category || undefined,
      });
      setNonprofits(data.nonprofits);
      setTotal(data.total);
    } catch {
      setNonprofits([]);
      setTotal(0);
    }
  }, [query, category]);

  useEffect(() => {
    setLoading(true);
    fetchNonprofits().finally(() => setLoading(false));
  }, [fetchNonprofits]);

  // Fetch users whenever query changes (only when searching)
  useEffect(() => {
    if (!query) {
      setUserResults([]);
      return;
    }
    const q = query.startsWith("@") ? query.slice(1) : query;
    if (!q) { setUserResults([]); return; }
    setUserSearching(true);
    api.users.search(q)
      .then((d) => setUserResults(d.users))
      .catch(() => setUserResults([]))
      .finally(() => setUserSearching(false));
  }, [query]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNonprofits();
    setRefreshing(false);
  }, [fetchNonprofits]);

  // Location for map mode
  useEffect(() => {
    if (viewMode !== "map" || userRegion) return;
    (async () => {
      setLocLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { setUserRegion(US_FALLBACK); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: NEARBY_DELTA,
          longitudeDelta: NEARBY_DELTA,
        });
      } catch {
        setUserRegion(US_FALLBACK);
      } finally {
        setLocLoading(false);
      }
    })();
  }, [viewMode]);

  useEffect(() => {
    if (userRegion && mapRef.current) {
      mapRef.current.animateToRegion(userRegion, 800);
    }
  }, [userRegion]);

  // ── Search result logic ────────────────────────────────────────────────────

  const isAtSearch = query.startsWith("@");
  const searchQ = isAtSearch ? query.slice(1) : query;
  const isSearching = query.length > 0;

  // Top 3 of each
  const topUsers = userResults.slice(0, 3);
  const topNonprofits = nonprofits.slice(0, 3);

  // Determine which section to show first based on relevance of top hit
  const topUserScore = topUsers[0]
    ? Math.max(
        relevanceScore(topUsers[0].name, searchQ),
        relevanceScore(topUsers[0].username, searchQ),
      )
    : 0;
  const topNpScore = topNonprofits[0] ? relevanceScore(topNonprofits[0].name, searchQ) : 0;
  const usersFirst = isAtSearch || (topUserScore > 0 && topUserScore >= topNpScore);

  const hasUsers = topUsers.length > 0;
  const hasNonprofits = !isAtSearch && topNonprofits.length > 0;
  const searchBusy = userSearching || loading;

  // ── Render helpers ─────────────────────────────────────────────────────────

  function UserRow({ u }: { u: UserSearchResult }) {
    const initials = (u.name ?? u.username)[0]?.toUpperCase() ?? "?";
    return (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => { Keyboard.dismiss(); router.push(`/profile/${u.username}` as never); }}
        activeOpacity={0.7}
      >
        {u.avatarUrl ? (
          <Image source={{ uri: u.avatarUrl }} style={styles.userAvatar} />
        ) : (
          <View style={[styles.userAvatar, styles.userAvatarFallback]}>
            <Text style={styles.userAvatarInitial}>{initials}</Text>
          </View>
        )}
        <View style={styles.resultText}>
          <Text style={styles.resultName} numberOfLines={1}>
            {u.name ?? u.username}
          </Text>
          <Text style={styles.resultSub} numberOfLines={1}>@{u.username}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={COLORS.gray200} />
      </TouchableOpacity>
    );
  }

  function NonprofitRow({ np }: { np: Nonprofit }) {
    return (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => { Keyboard.dismiss(); router.push(`/nonprofit/${np.id}`); }}
        activeOpacity={0.7}
      >
        {np.logoUrl ? (
          <Image source={{ uri: np.logoUrl }} style={styles.npLogo} />
        ) : (
          <View style={[styles.npLogo, styles.npLogoFallback]}>
            <Ionicons name="heart" size={14} color={COLORS.brand} />
          </View>
        )}
        <View style={styles.resultText}>
          <View style={styles.npNameRow}>
            <Text style={styles.resultName} numberOfLines={1}>{np.name}</Text>
            {np.verified && (
              <Ionicons name="checkmark-circle" size={14} color={COLORS.brand} style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={styles.resultSub} numberOfLines={1}>
            {np.category.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={COLORS.gray200} />
      </TouchableOpacity>
    );
  }

  function SectionHeader({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
    return (
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={13} color={COLORS.gray400} />
        <Text style={styles.sectionHeaderText}>{label}</Text>
      </View>
    );
  }

  function renderSearchResults() {
    if (searchBusy && !hasUsers && !hasNonprofits) {
      return (
        <View style={styles.searchCenter}>
          <ActivityIndicator color={COLORS.brand} />
        </View>
      );
    }

    if (!hasUsers && !hasNonprofits) {
      return (
        <View style={styles.searchCenter}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="search" size={32} color={COLORS.gray300} />
          </View>
          <Text style={styles.emptyTitle}>No results for "{searchQ}"</Text>
          <Text style={styles.emptySub}>Try a different name or username</Text>
        </View>
      );
    }

    const peopleSection = hasUsers ? (
      <View key="people" style={styles.section}>
        <SectionHeader label="People" icon="person-outline" />
        {topUsers.map((u) => <UserRow key={u.id} u={u} />)}
      </View>
    ) : null;

    const nonprofitsSection = hasNonprofits ? (
      <View key="nonprofits" style={styles.section}>
        <SectionHeader label="Nonprofits" icon="heart-outline" />
        {topNonprofits.map((np) => <NonprofitRow key={np.id} np={np} />)}
      </View>
    ) : null;

    const sections = usersFirst
      ? [peopleSection, nonprofitsSection]
      : [nonprofitsSection, peopleSection];

    return (
      <ScrollView
        style={styles.searchResults}
        contentContainerStyle={styles.searchResultsContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {sections}
      </ScrollView>
    );
  }

  // ── Map / list grid ────────────────────────────────────────────────────────

  const mappable = nonprofits.filter((np) => np.latitude != null && np.longitude != null);
  const featured = nonprofits[0] ?? null;
  const gridItems = nonprofits.slice(1);

  const renderGridHeader = () => (
    <View>
      {featured && (
        <NonprofitCard nonprofit={featured} donationCount={featured._count?.donations} featured />
      )}
      {total > 0 && (
        <Text style={styles.totalText}>{total} nonprofit{total !== 1 ? "s" : ""}</Text>
      )}
    </View>
  );

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* ── Search bar ── */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchBar, isSearching && styles.searchBarActive]}>
          <Ionicons name="search" size={18} color={isSearching ? COLORS.brand : COLORS.gray400} />
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="Search people or nonprofits..."
            placeholderTextColor={COLORS.gray300}
            style={styles.searchInput}
            clearButtonMode="while-editing"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* List / Map toggle — hidden while searching */}
        {!isSearching && (
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segmentBtn, viewMode === "list" && styles.segmentBtnActive]}
              onPress={() => setViewMode("list")}
              activeOpacity={0.8}
            >
              <Ionicons
                name={viewMode === "list" ? "grid" : "grid-outline"}
                size={16}
                color={viewMode === "list" ? COLORS.white : COLORS.gray500}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, viewMode === "map" && styles.segmentBtnActive]}
              onPress={() => setViewMode("map")}
              activeOpacity={0.8}
            >
              <Ionicons
                name={viewMode === "map" ? "map" : "map-outline"}
                size={16}
                color={viewMode === "map" ? COLORS.white : COLORS.gray500}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel button — shown while searching */}
        {isSearching && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => { setSearch(""); Keyboard.dismiss(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category chips — hidden while searching ── */}
      {!isSearching && (
        <View style={styles.chipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(c.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={c.icon} size={14} color={active ? COLORS.white : COLORS.gray500} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Content ── */}
      {isSearching ? (
        renderSearchResults()
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.brand} size="large" />
        </View>
      ) : viewMode === "list" ? (
        <FlatList
          data={gridItems}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NonprofitCard nonprofit={item} donationCount={item._count?.donations} />
          )}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          ListHeaderComponent={renderGridHeader}
          ListEmptyComponent={
            featured ? null : (
              <View style={styles.empty}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="search" size={40} color={COLORS.gray300} />
                </View>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySub}>Try a different search or category</Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.brand} colors={[COLORS.brand]} />
          }
        />
      ) : (
        /* ── Map view ── */
        <View style={styles.mapContainer}>
          {locLoading && (
            <View style={styles.locBanner}>
              <ActivityIndicator size="small" color={COLORS.brand} />
              <Text style={styles.locBannerText}>Finding your location...</Text>
            </View>
          )}

          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={US_FALLBACK}
            showsUserLocation
            showsMyLocationButton={false}
            onPress={() => Keyboard.dismiss()}
            onRegionChangeComplete={(r) => { currentRegion.current = r; }}
          >
            {mappable.map((np) => (
              <Marker
                key={np.id}
                coordinate={{ latitude: np.latitude!, longitude: np.longitude! }}
                onPress={() => setSelected(np)}
              >
                <View style={[styles.pin, selected?.id === np.id && styles.pinSelected]}>
                  <Ionicons name="heart" size={12} color={COLORS.white} />
                </View>
              </Marker>
            ))}
          </MapView>

          <View style={styles.mapControls}>
            <TouchableOpacity style={styles.mapControlBtn} onPress={() => zoom("in")} activeOpacity={0.8}>
              <Ionicons name="add" size={22} color={COLORS.gray700} />
            </TouchableOpacity>
            <View style={styles.mapControlDivider} />
            <TouchableOpacity style={styles.mapControlBtn} onPress={() => zoom("out")} activeOpacity={0.8}>
              <Ionicons name="remove" size={22} color={COLORS.gray700} />
            </TouchableOpacity>
          </View>

          {userRegion && userRegion !== US_FALLBACK && (
            <TouchableOpacity style={styles.locBtn} onPress={() => mapRef.current?.animateToRegion(userRegion, 500)} activeOpacity={0.8}>
              <Ionicons name="locate" size={20} color={COLORS.brand} />
            </TouchableOpacity>
          )}

          {selected && (
            <View style={styles.callout}>
              <View style={styles.calloutInner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.calloutName} numberOfLines={1}>{selected.name}</Text>
                  <Text style={styles.calloutCat}>{selected.category.replace(/_/g, " ")}</Text>
                </View>
                <TouchableOpacity style={styles.calloutBtn} onPress={() => router.push(`/nonprofit/${selected.id}`)} activeOpacity={0.8}>
                  <Text style={styles.calloutBtnText}>View</Text>
                  <Ionicons name="chevron-forward" size={13} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.calloutClose} onPress={() => setSelected(null)} activeOpacity={0.7}>
                  <Ionicons name="close" size={16} color={COLORS.gray400} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },

  // ── Search bar ──────────────────────────────────────────────────────────
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray100,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  searchBarActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.white,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.gray900,
  },
  cancelBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  cancelText: { fontSize: 15, color: COLORS.brand, fontWeight: "600" },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    width: 34, height: 34,
    alignItems: "center", justifyContent: "center",
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },

  // ── Category chips ──────────────────────────────────────────────────────
  chipsWrapper: { height: 46, marginBottom: 2 },
  chips: { paddingHorizontal: 12, gap: 8, alignItems: "center", flexDirection: "row" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    height: 34, paddingHorizontal: 14, borderRadius: 100,
    backgroundColor: COLORS.white,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  chipActive: {
    backgroundColor: COLORS.brand,
    shadowColor: COLORS.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  chipText: { fontSize: 13, color: COLORS.gray600, fontWeight: "600" },
  chipTextActive: { color: COLORS.white },

  // ── Search results ──────────────────────────────────────────────────────
  searchResults: { flex: 1, backgroundColor: COLORS.gray50 },
  searchResultsContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 110 },
  searchCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },

  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    backgroundColor: COLORS.bg,
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },

  // User rows
  userAvatar: { width: 42, height: 42, borderRadius: 21 },
  userAvatarFallback: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarInitial: { fontSize: 17, fontWeight: "700", color: COLORS.brandDark },

  // Nonprofit rows
  npLogo: { width: 42, height: 42, borderRadius: 12 },
  npLogoFallback: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  npNameRow: { flexDirection: "row", alignItems: "center" },

  // Shared row text
  resultText: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: "700", color: COLORS.gray900 },
  resultSub: { fontSize: 13, color: COLORS.gray400, marginTop: 1 },

  // ── Grid list ───────────────────────────────────────────────────────────
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 12, paddingBottom: 110, paddingTop: 4 },
  gridRow: { justifyContent: "space-between" },
  totalText: {
    fontSize: 12, color: COLORS.gray400, marginBottom: 10,
    fontWeight: "500", letterSpacing: 0.3, textTransform: "uppercase",
  },

  // ── Empty state ─────────────────────────────────────────────────────────
  empty: { alignItems: "center", marginTop: 60 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.gray100,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: COLORS.gray600 },
  emptySub: { fontSize: 13, color: COLORS.gray400, marginTop: 4 },

  // ── Map ─────────────────────────────────────────────────────────────────
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  locBanner: {
    position: "absolute", top: 12, alignSelf: "center", zIndex: 10,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  locBannerText: { fontSize: 13, color: COLORS.gray600, fontWeight: "600" },
  mapControls: {
    position: "absolute", top: 12, right: 12,
    backgroundColor: COLORS.white, borderRadius: 14, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  mapControlBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  mapControlDivider: { height: 1, backgroundColor: COLORS.gray100, marginHorizontal: 8 },
  locBtn: {
    position: "absolute", top: 108, right: 12,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  pin: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  pinSelected: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.brandDark },
  callout: { position: "absolute", bottom: 110, left: 16, right: 16 },
  calloutInner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.white, borderRadius: 18, padding: 14, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
  },
  calloutName: { fontSize: 15, fontWeight: "700", color: COLORS.gray900 },
  calloutCat: { fontSize: 12, color: COLORS.gray400, marginTop: 2, textTransform: "capitalize" },
  calloutBtn: {
    flexDirection: "row", alignItems: "center", gap: 2,
    backgroundColor: COLORS.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  calloutBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.white },
  calloutClose: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.gray50, alignItems: "center", justifyContent: "center",
  },
});
