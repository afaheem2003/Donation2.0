import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { COLORS } from "@/lib/utils";

const SUGGESTIONS = [
  "Cornell University",
  "Harvard University",
  "MIT",
  "NYU",
  "Columbia University",
  "Stanford University",
  "Yale University",
  "Princeton University",
];

const TOTAL_STEPS = 4;
const CURRENT_STEP = 3;

export default function CommunityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  const visibleSuggestions = school.trim().length > 0
    ? SUGGESTIONS.filter((s) => s.toLowerCase().includes(school.toLowerCase()))
    : SUGGESTIONS;

  async function handleContinue() {
    if (saving) return;
    setSaving(true);
    try {
      if (school.trim()) {
        await api.users.completeOnboarding({ school: school.trim() });
      }
      router.push("/onboarding/giving");
    } catch {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    router.push("/onboarding/giving");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.white }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
          <Text style={styles.heading}>Where are you based?</Text>
          <Text style={styles.subheading}>
            We'll surface nearby nonprofits and your school's causes.
          </Text>

          {/* Input */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={school}
              onChangeText={setSchool}
              placeholder="Your university or school (optional)"
              placeholderTextColor={COLORS.gray300}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Suggestion chips */}
          <ScrollView
            horizontal={false}
            showsVerticalScrollIndicator={false}
            style={styles.chipsScroll}
          >
            <View style={styles.chipsWrap}>
              {visibleSuggestions.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, school === s && styles.chipSelected]}
                  onPress={() => setSchool(s)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, school === s && styles.chipTextSelected]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  inputWrap: {
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  input: {
    fontSize: 16,
    color: COLORS.gray900,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.gray600,
  },
  chipTextSelected: {
    color: COLORS.brandDark,
    fontWeight: "600",
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
