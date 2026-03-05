import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/utils";

const CATEGORIES = [
  { key: "EDUCATION",      emoji: "🎓", label: "Education" },
  { key: "ENVIRONMENT",    emoji: "🌱", label: "Planet" },
  { key: "HEALTH",         emoji: "❤️", label: "Health" },
  { key: "ANIMALS",        emoji: "🐾", label: "Animals" },
  { key: "ARTS",           emoji: "🎨", label: "Arts" },
  { key: "HUMAN_SERVICES", emoji: "🤝", label: "Community" },
  { key: "INTERNATIONAL",  emoji: "🌍", label: "Global" },
  { key: "RELIGION",       emoji: "✝️", label: "Faith" },
] as const;

const TOTAL_STEPS = 4;
const CURRENT_STEP = 2;

export default function InterestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleContinue() {
    if (selected.length === 0 || saving) return;
    setSaving(true);
    try {
      await api.users.completeOnboarding({ interests: selected });
      router.push("/onboarding/community");
    } catch {
      Alert.alert("Error", "Could not save your interests. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canContinue = selected.length > 0;

  return (
    <View style={[styles.outer, { paddingTop: insets.top }]}>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i < CURRENT_STEP && styles.progressDotFilled]}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.heading}>What causes move you?</Text>
        <Text style={styles.subheading}>
          Pick at least one. We'll find nonprofits you'll love.
        </Text>

        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selected.includes(cat.key);
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => toggle(cat.key)}
                activeOpacity={0.75}
              >
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  </View>
                )}
                <Text style={styles.emoji}>{cat.emoji}</Text>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Bottom button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.btnText}>Continue</Text>
          )}
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
  progressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray200,
  },
  progressDotFilled: {
    backgroundColor: COLORS.brand,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.gray900,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 15,
    color: COLORS.gray500,
    lineHeight: 22,
    marginBottom: 28,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    width: "47%",
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 8,
    position: "relative",
  },
  cardSelected: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray700,
  },
  cardLabelSelected: {
    color: COLORS.brandDark,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: COLORS.white,
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
  btnDisabled: {
    backgroundColor: COLORS.gray200,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.white,
  },
});
