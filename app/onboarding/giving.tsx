import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/utils";

const OPTIONS = [
  {
    key: "one_time",
    emoji: "🎯",
    title: "When inspired",
    subtitle: "One donation at a time, when something moves me",
  },
  {
    key: "monthly",
    emoji: "📅",
    title: "Regular supporter",
    subtitle: "I set a monthly or yearly giving goal",
  },
  {
    key: "whenever",
    emoji: "💛",
    title: "Whenever I can",
    subtitle: "No pressure, just when it feels right",
  },
] as const;

const TOTAL_STEPS = 4;
const CURRENT_STEP = 4;

export default function GivingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleContinue() {
    if (saving) return;
    setSaving(true);
    try {
      await api.users.completeOnboarding({
        ...(selected ? { givingFrequency: selected } : {}),
        complete: true,
      });
      router.replace("/onboarding/ready");
    } catch {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    if (saving) return;
    setSaving(true);
    try {
      await api.users.completeOnboarding({ complete: true });
      router.replace("/onboarding/ready");
    } catch {
      Alert.alert("Error", "Could not continue. Please try again.");
    } finally {
      setSaving(false);
    }
  }

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
        <Text style={styles.heading}>How do you like to give?</Text>
        <Text style={styles.subheading}>
          We'll tailor your experience around your rhythm.
        </Text>

        <View style={styles.optionsList}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => setSelected(isSelected ? null : opt.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                    {opt.title}
                  </Text>
                  <Text style={styles.optionSubtitle}>{opt.subtitle}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.btn}
          onPress={handleContinue}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.btnText}>Continue</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={saving}>
          <Text style={styles.skipText}>Skip</Text>
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
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  optionCardSelected: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  optionEmoji: {
    fontSize: 26,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: COLORS.brandDark,
  },
  optionSubtitle: {
    fontSize: 13,
    color: COLORS.gray500,
    lineHeight: 18,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: COLORS.brand,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.brand,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: COLORS.white,
    gap: 8,
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
  skipBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gray400,
  },
});
