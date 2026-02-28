import React from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Nonprofit } from "@/lib/api";
import { COLORS } from "@/lib/utils";

const CARD_GAP = 10;
const CARD_WIDTH = (Dimensions.get("window").width - 12 * 2 - CARD_GAP) / 2;
const IMAGE_HEIGHT = 140;

interface Props {
  nonprofit: Nonprofit;
  donationCount?: number;
  featured?: boolean;
}

export function NonprofitCard({ nonprofit, donationCount, featured }: Props) {
  const router = useRouter();
  const initial = nonprofit.name[0]?.toUpperCase() ?? "N";

  const categoryLabel = nonprofit.category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (featured) {
    return (
      <TouchableOpacity
        style={styles.featuredCard}
        onPress={() => router.push(`/nonprofit/${nonprofit.id}` as never)}
        activeOpacity={0.9}
      >
        {nonprofit.logoUrl ? (
          <Image source={{ uri: nonprofit.logoUrl }} style={styles.featuredImage} />
        ) : (
          <View style={[styles.featuredImage, styles.fallbackGradient]}>
            <Text style={styles.featuredInitial}>{initial}</Text>
          </View>
        )}
        {/* Gradient overlay */}
        <View style={styles.featuredOverlay} />

        {/* Category badge */}
        <View style={styles.featuredCategoryBadge}>
          <Text style={styles.featuredCategoryText}>{categoryLabel}</Text>
        </View>

        {/* Bottom info */}
        <View style={styles.featuredInfo}>
          <View style={styles.featuredNameRow}>
            <Text style={styles.featuredName} numberOfLines={1}>{nonprofit.name}</Text>
            {nonprofit.verified && (
              <Ionicons name="checkmark-circle" size={18} color={COLORS.brand} />
            )}
          </View>
          <Text style={styles.featuredDescription} numberOfLines={2}>
            {nonprofit.description}
          </Text>
        </View>

        {/* Donation badge */}
        {!!donationCount && donationCount > 0 && (
          <View style={styles.donationBadge}>
            <Ionicons name="heart" size={11} color={COLORS.white} />
            <Text style={styles.donationBadgeText}>{donationCount.toLocaleString()}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/nonprofit/${nonprofit.id}` as never)}
      activeOpacity={0.9}
    >
      {/* Image area */}
      {nonprofit.logoUrl ? (
        <Image source={{ uri: nonprofit.logoUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.fallbackGradient]}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
      )}

      {/* Category pill overlaid on image */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{categoryLabel}</Text>
      </View>

      {/* Donation badge */}
      {!!donationCount && donationCount > 0 && (
        <View style={styles.donationBadge}>
          <Ionicons name="heart" size={11} color={COLORS.white} />
          <Text style={styles.donationBadgeText}>{donationCount.toLocaleString()}</Text>
        </View>
      )}

      {/* Info below image */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{nonprofit.name}</Text>
          {nonprofit.verified && (
            <Ionicons name="checkmark-circle" size={14} color={COLORS.brand} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Grid tile card ──────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: CARD_GAP,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  image: {
    width: "100%",
    height: IMAGE_HEIGHT,
    backgroundColor: COLORS.gray100,
  },
  fallbackGradient: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.brand,
    opacity: 0.6,
  },
  categoryBadge: {
    position: "absolute",
    top: IMAGE_HEIGHT - 28,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  donationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  donationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.white,
  },
  info: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray900,
    flex: 1,
  },

  // ── Featured hero card ──────────────────────────────────────
  featuredCard: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.gray100,
  },
  featuredInitial: {
    fontSize: 56,
    fontWeight: "800",
    color: COLORS.brand,
    opacity: 0.5,
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  featuredCategoryBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  featuredCategoryText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  featuredInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  featuredNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  featuredName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.white,
    flex: 1,
  },
  featuredDescription: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 17,
  },
});
