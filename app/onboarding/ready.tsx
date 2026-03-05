import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, Nonprofit } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  EDUCATION: "Education",
  ENVIRONMENT: "Planet",
  HEALTH: "Health",
  ANIMALS: "Animals",
  ARTS: "Arts",
  HUMAN_SERVICES: "Community",
  INTERNATIONAL: "Global",
  RELIGION: "Faith",
  COMMUNITY: "Community",
  OTHER: "Other",
};

export default function ReadyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshSession } = useAuth();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  const [nonprofits, setNonprofits] = useState<Nonprofit[]>([]);
  const [loadingNPs, setLoadingNPs] = useState(true);

  useEffect(() => {
    // Spring animation for the checkmark circle
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 12,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(checkAnim, {
      toValue: 1,
      duration: 400,
      delay: 500,
      useNativeDriver: true,
    }).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const firstInterest = user?.interests?.[0];
    const category = firstInterest ?? undefined;
    api.nonprofits
      .list({ category, page: 1 })
      .then((res) => setNonprofits(res.nonprofits.slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoadingNPs(false));
  }, [user]);

  async function handleGoToFeed() {
    await refreshSession();
    router.replace("/(tabs)");
  }

  return (
    <View style={[styles.outer, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated checkmark */}
        <View style={styles.circleWrap}>
          <Animated.View style={[styles.circle, { transform: [{ scale: scaleAnim }] }]}>
            <Animated.View style={{ opacity: checkAnim }}>
              <Ionicons name="checkmark" size={52} color={COLORS.white} />
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.heading}>Your feed is ready</Text>
          <Text style={styles.subheading}>
            We've found nonprofits matching your interests.
          </Text>

          {/* Nonprofit previews */}
          {loadingNPs ? (
            <ActivityIndicator color={COLORS.brand} style={{ marginTop: 24 }} />
          ) : nonprofits.length > 0 ? (
            <View style={styles.npList}>
              {nonprofits.map((np) => (
                <TouchableOpacity
                  key={np.id}
                  style={styles.npCard}
                  onPress={() => router.push(`/nonprofit/${np.id}`)}
                  activeOpacity={0.75}
                >
                  <View style={styles.npCardLeft}>
                    <View style={styles.npAvatar}>
                      <Text style={styles.npAvatarText}>
                        {np.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.npInfo}>
                      <Text style={styles.npName} numberOfLines={1}>
                        {np.name}
                      </Text>
                      <View style={styles.npMeta}>
                        <View style={styles.pill}>
                          <Text style={styles.pillText}>
                            {CATEGORY_LABELS[np.category] ?? np.category}
                          </Text>
                        </View>
                        {np.verified && (
                          <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={13} color={COLORS.brand} />
                            <Text style={styles.verifiedText}>Verified</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.gray300} />
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {nonprofits.length > 0 && (
            <TouchableOpacity
              style={styles.viewFeedLink}
              onPress={handleGoToFeed}
              activeOpacity={0.7}
            >
              <Text style={styles.viewFeedText}>View feed</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.brand} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleGoToFeed} activeOpacity={0.85}>
          <Text style={styles.btnText}>Go to my feed</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: "center",
  },
  circleWrap: {
    marginBottom: 32,
    alignItems: "center",
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.gray900,
    textAlign: "center",
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    color: COLORS.gray500,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  npList: {
    width: "100%",
    gap: 10,
    marginBottom: 12,
  },
  npCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.gray100,
    borderRadius: 14,
    padding: 14,
    backgroundColor: COLORS.white,
  },
  npCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  npAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  npAvatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.brand,
  },
  npInfo: {
    flex: 1,
  },
  npName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  npMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pill: {
    backgroundColor: COLORS.brandLight,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.brandDark,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  verifiedText: {
    fontSize: 11,
    color: COLORS.brand,
    fontWeight: "600",
  },
  viewFeedLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    paddingVertical: 8,
  },
  viewFeedText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.brand,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  btn: {
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.white,
  },
});
