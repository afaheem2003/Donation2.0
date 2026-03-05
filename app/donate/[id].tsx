import { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Image, Animated,
  KeyboardAvoidingView, Platform, Switch, Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api, Nonprofit } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { COLORS, formatCents } from "@/lib/utils";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type Step = "amount" | "share";

interface PaymentMethod {
  id: string;
  brand: "visa" | "mastercard" | "amex" | "apple_pay";
  last4?: string;
  exp?: string;
  label: string;
}

const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "apple_pay", brand: "apple_pay", label: "Apple Pay" },
  { id: "card_1",   brand: "visa",       last4: "4242", exp: "12/26", label: "Visa •••• 4242" },
  { id: "card_2",   brand: "mastercard", last4: "5555", exp: "08/27", label: "Mastercard •••• 5555" },
];

const BRAND_COLOR: Record<string, string> = {
  visa: "#1A1F71",
  mastercard: "#EB001B",
  amex: "#007DC5",
  apple_pay: "#000000",
};

const BRAND_LABEL: Record<string, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
  apple_pay: "",
};

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

const CAT_COLOR: Record<string, string> = {
  EDUCATION: "#4A90E2", HEALTH: "#F04438", ENVIRONMENT: "#12B76A",
  ARTS: "#9B4AE2", HUMAN_SERVICES: "#FF9500", ANIMALS: "#FFCC00",
  INTERNATIONAL: "#007AFF", RELIGION: "#8E8E93", COMMUNITY: COLORS.brand, OTHER: COLORS.gray300,
};
const CAT_ICON: Record<string, IoniconName> = {
  EDUCATION: "school-outline", HEALTH: "medical-outline", ENVIRONMENT: "leaf-outline",
  ARTS: "color-palette-outline", HUMAN_SERVICES: "people-outline", ANIMALS: "paw-outline",
  INTERNATIONAL: "earth-outline", RELIGION: "prism-outline", COMMUNITY: "home-outline", OTHER: "ellipsis-horizontal-outline",
};
const CAT_LABEL: Record<string, string> = {
  EDUCATION: "Education", HEALTH: "Health", ENVIRONMENT: "Planet",
  ARTS: "Arts", HUMAN_SERVICES: "Services", ANIMALS: "Animals",
  INTERNATIONAL: "Global", RELIGION: "Religion", COMMUNITY: "Community", OTHER: "Other",
};

// ─── Org header card ──────────────────────────────────────────────────────────

function OrgHeader({ org }: { org: Nonprofit }) {
  const color = CAT_COLOR[org.category] ?? COLORS.brand;
  const icon = CAT_ICON[org.category] ?? "ellipsis-horizontal-outline";
  const label = CAT_LABEL[org.category] ?? org.category;

  return (
    <View style={styles.orgCard}>
      {org.logoUrl ? (
        <Image source={{ uri: org.logoUrl }} style={[styles.orgLogo, { borderColor: color + "33" }]} />
      ) : (
        <View style={[styles.orgLogo, { backgroundColor: color + "20", borderColor: color + "33", alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ fontSize: 28, fontWeight: "800", color }}>{org.name.charAt(0)}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={styles.orgName} numberOfLines={1}>{org.name}</Text>
          {org.verified && <Ionicons name="checkmark-circle" size={16} color={COLORS.brand} />}
        </View>
        <View style={[styles.catPill, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={11} color={color} />
          <Text style={[styles.catPillText, { color }]}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Amount step ──────────────────────────────────────────────────────────────

function centsToDisplay(c: number): string {
  const dollars = Math.floor(c / 100);
  const cents = c % 100;
  const dollarsFormatted = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${dollarsFormatted}.${cents.toString().padStart(2, "0")}`;
}

function AmountStep({
  org, user, onPay,
}: {
  org: Nonprofit;
  user: ReturnType<typeof useAuth>["user"];
  onPay: (amountCents: number) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [cents, setCents] = useState(2500);
  const [paying, setPaying] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(MOCK_PAYMENT_METHODS[0]);

  const isValid = cents >= 100;
  const activeChip = QUICK_AMOUNTS.find((a) => a * 100 === cents) ?? null;
  const displayValue = centsToDisplay(cents);

  function pickPaymentMethod() {
    Alert.alert(
      "Payment method",
      undefined,
      [
        ...MOCK_PAYMENT_METHODS.map((m) => ({
          text: (selectedMethod.id === m.id ? "✓  " : "     ") + m.label,
          onPress: () => setSelectedMethod(m),
        })),
        {
          text: "+ Add new card",
          onPress: () => Alert.alert("Coming soon", "Card management will be available soon."),
        },
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  }

  async function handleDonate() {
    if (!user) { router.push("/auth/signin"); return; }
    if (!isValid) { Alert.alert("Minimum donation is $1.00"); return; }
    setPaying(true);
    await onPay(cents);
    setPaying(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.amountContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <OrgHeader org={org} />

        <TouchableOpacity
          style={styles.amountDisplay}
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
        >
          <Text style={[
            styles.dollarSign,
            {
              fontSize:
                displayValue.length <= 6 ? 32 :
                displayValue.length <= 9 ? 26 : 20,
              marginTop:
                displayValue.length <= 6 ? 10 :
                displayValue.length <= 9 ? 8 : 6,
            },
          ]}>$</Text>
          <TextInput
            ref={inputRef}
            style={[
              styles.amountBig,
              {
                fontSize:
                  displayValue.length <= 6 ? 72 :
                  displayValue.length <= 9 ? 56 : 44,
              },
            ]}
            value={displayValue}
            onChangeText={() => {}}
            onKeyPress={({ nativeEvent }) => {
              const { key } = nativeEvent;
              if (key === "Backspace") {
                setCents((c) => Math.floor(c / 10));
              } else if (key >= "0" && key <= "9") {
                const digit = parseInt(key, 10);
                setCents((c) => (c < 1000000 ? c * 10 + digit : c));
              }
            }}
            keyboardType="number-pad"
            caretHidden
            showSoftInputOnFocus
          />
        </TouchableOpacity>

        <View style={styles.quickRow}>
          {QUICK_AMOUNTS.map((amt) => {
            const active = activeChip === amt;
            return (
              <TouchableOpacity
                key={amt}
                style={[styles.quickChip, active && styles.quickChipActive]}
                onPress={() => { setCents(amt * 100); inputRef.current?.blur(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>
                  ${amt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Payment method picker */}
        {user && (
          <TouchableOpacity style={styles.paymentRow} onPress={pickPaymentMethod} activeOpacity={0.75}>
            <View style={[styles.paymentBrandBadge, { backgroundColor: BRAND_COLOR[selectedMethod.brand] }]}>
              {selectedMethod.brand === "apple_pay" ? (
                <Ionicons name="logo-apple" size={14} color="#fff" />
              ) : (
                <Text style={styles.paymentBrandText}>{BRAND_LABEL[selectedMethod.brand]}</Text>
              )}
            </View>
            <Text style={styles.paymentLabel}>{selectedMethod.label}</Text>
            <Ionicons name="chevron-expand" size={16} color={COLORS.gray400} />
          </TouchableOpacity>
        )}

        <View style={styles.authBanner}>
          {user ? (
            <>
              <View style={[styles.authIcon, { backgroundColor: COLORS.brandLight }]}>
                <Ionicons name="person-circle-outline" size={18} color={COLORS.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.authBannerTitle}>Signed in as {user.name ?? user.email}</Text>
                <Text style={styles.authBannerSub}>Your donation history will be saved</Text>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.authIcon, { backgroundColor: "#FFF3E0" }]}>
                <Ionicons name="person-outline" size={18} color="#FF9500" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.authBannerTitle}>Sign in to donate</Text>
                <Text style={styles.authBannerSub}>
                  <Text style={{ color: COLORS.brand, fontWeight: "600" }}
                    onPress={() => router.push("/auth/signin")}
                  >Sign in</Text> to track history & share your impact
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.stripeNote}>
          <Ionicons name="lock-closed" size={12} color={COLORS.gray400} />
          <Text style={styles.stripeNoteText}>Secure · Tax deductible</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.donateBtn, !isValid && styles.donateBtnDisabled]}
          onPress={handleDonate}
          disabled={!isValid || paying}
          activeOpacity={0.85}
        >
          {paying ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="heart" size={18} color={COLORS.white} />
              <Text style={styles.donateBtnText}>
                {user ? (isValid ? `Donate ${formatCents(cents)}` : "Donate") : "Sign in to donate"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Success checkmark animation ─────────────────────────────────────────────

function CheckAnim() {
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }).start();
  }, [scale]);
  return (
    <Animated.View style={[styles.checkCircle, { transform: [{ scale }] }]}>
      <Ionicons name="checkmark" size={40} color={COLORS.white} />
    </Animated.View>
  );
}

// ─── Share step ───────────────────────────────────────────────────────────────

function ShareStep({
  org, amountCents, donationId, user,
  onDone, onPosted,
}: {
  org: Nonprofit;
  amountCents: number;
  donationId: string;
  user: ReturnType<typeof useAuth>["user"];
  onDone: () => void;
  onPosted: () => void;
}) {
  const [step, setStep] = useState<"pick" | "compose" | "done">("pick");
  const [caption, setCaption] = useState("");
  const [showAmount, setShowAmount] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [posting, setPosting] = useState(false);
  const [quickPosting, setQuickPosting] = useState<"anon" | "amount" | null>(null);

  async function pickPhoto() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled) setPhoto(res.assets[0]);
  }

  async function submitQuickPost(withAmount: boolean) {
    if (!user) return;
    setQuickPosting(withAmount ? "amount" : "anon");
    try {
      await api.posts.create({
        nonprofitId: org.id,
        donationId: withAmount ? donationId : undefined,
        caption: "",
        allowComments: true,
      });
      onPosted();
      setStep("done");
    } catch {
      Alert.alert("Couldn't post", "Please try again.");
    } finally {
      setQuickPosting(null);
    }
  }

  async function submitPost() {
    if (!user) return;
    setPosting(true);
    try {
      await api.posts.create({
        nonprofitId: org.id,
        donationId: showAmount ? donationId : undefined,
        caption,
        imageUrl: photo?.uri,
        allowComments,
      });
      onPosted();
      setStep("done");
    } catch {
      Alert.alert("Couldn't post", "Please try again.");
    } finally {
      setPosting(false);
    }
  }

  if (step === "done") {
    return (
      <View style={styles.doneWrap}>
        <CheckAnim />
        <Text style={styles.doneTitle}>Posted!</Text>
        <Text style={styles.doneSub}>Your friends can see your impact</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.donateBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "compose") {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.composeContent} keyboardShouldPersistTaps="handled">
          {/* Post preview card */}
          <View style={styles.postPreview}>
            <View style={styles.postPreviewHeader}>
              <View style={styles.postAvatar}>
                <Ionicons name="person" size={18} color={COLORS.white} />
              </View>
              <View>
                <Text style={styles.postPreviewName}>{user?.name ?? "You"}</Text>
                <Text style={styles.postPreviewSub}>
                  {showAmount ? formatCents(amountCents) : "Donated"} · {org.name}
                </Text>
              </View>
            </View>

            {photo ? (
              <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
                <Image source={{ uri: photo.uri }} style={styles.postPhoto} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.photoPlaceholder} onPress={pickPhoto} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={28} color={COLORS.gray300} />
                <Text style={styles.photoPlaceholderText}>Add a photo</Text>
              </TouchableOpacity>
            )}

            <TextInput
              style={styles.captionInput}
              value={caption}
              onChangeText={setCaption}
              multiline
              placeholder="Write a caption..."
              placeholderTextColor={COLORS.gray300}
            />
          </View>

          {/* Show amount toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="cash-outline" size={18} color={COLORS.gray600} />
              <View>
                <Text style={styles.toggleLabel}>Show donation amount</Text>
                <Text style={styles.toggleSub}>Visible to followers</Text>
              </View>
            </View>
            <Switch
              value={showAmount}
              onValueChange={setShowAmount}
              trackColor={{ false: COLORS.gray200, true: COLORS.brandLight }}
              thumbColor={showAmount ? COLORS.brand : COLORS.gray300}
            />
          </View>

          {/* Allow comments toggle */}
          <View style={[styles.toggleRow, { marginTop: 10 }]}>
            <View style={styles.toggleLeft}>
              <Ionicons name="chatbubble-outline" size={18} color={COLORS.gray600} />
              <View>
                <Text style={styles.toggleLabel}>Allow comments</Text>
                <Text style={styles.toggleSub}>Let others respond to your post</Text>
              </View>
            </View>
            <Switch
              value={allowComments}
              onValueChange={setAllowComments}
              trackColor={{ false: COLORS.gray200, true: COLORS.brandLight }}
              thumbColor={allowComments ? COLORS.brand : COLORS.gray300}
            />
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.donateBtn, { flex: 1 }]}
            onPress={submitPost}
            disabled={posting}
            activeOpacity={0.85}
          >
            {posting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color={COLORS.white} />
                <Text style={styles.donateBtnText}>Post to Feed</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // step === "pick"
  return (
    <ScrollView contentContainerStyle={styles.shareContent}>
      <CheckAnim />
      <Text style={styles.shareTitle}>You donated {formatCents(amountCents)}!</Text>
      <Text style={styles.shareSub}>to {org.name}</Text>

      <Text style={styles.shareQuestion}>How would you like to share?</Text>

      {/* 1. Private */}
      <TouchableOpacity style={styles.shareCard} onPress={onDone} activeOpacity={0.8}>
        <View style={[styles.shareCardIcon, { backgroundColor: "#F5F5F5" }]}>
          <Ionicons name="lock-closed-outline" size={24} color={COLORS.gray500} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.shareCardTitle}>Keep Private</Text>
          <Text style={styles.shareCardSub}>Just for your records</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
      </TouchableOpacity>

      {/* 2. Just donated (no amount) */}
      <TouchableOpacity
        style={styles.shareCard}
        onPress={() => submitQuickPost(false)}
        disabled={quickPosting !== null}
        activeOpacity={0.8}
      >
        <View style={[styles.shareCardIcon, { backgroundColor: "#EEF4FF" }]}>
          <Ionicons name="person-outline" size={24} color="#4A90E2" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.shareCardTitle}>Just donated</Text>
          <Text style={styles.shareCardSub}>Share without the dollar amount</Text>
        </View>
        {quickPosting === "anon"
          ? <ActivityIndicator size="small" color={COLORS.brand} />
          : <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />}
      </TouchableOpacity>

      {/* 3. Show amount */}
      <TouchableOpacity
        style={styles.shareCard}
        onPress={() => submitQuickPost(true)}
        disabled={quickPosting !== null}
        activeOpacity={0.8}
      >
        <View style={[styles.shareCardIcon, { backgroundColor: COLORS.brandLight }]}>
          <Ionicons name="cash-outline" size={24} color={COLORS.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.shareCardTitle}>Donated {formatCents(amountCents)}</Text>
          <Text style={styles.shareCardSub}>Show your contribution amount</Text>
        </View>
        {quickPosting === "amount"
          ? <ActivityIndicator size="small" color={COLORS.brand} />
          : <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />}
      </TouchableOpacity>

      {/* 4. Custom post */}
      <TouchableOpacity
        style={styles.shareCard}
        onPress={() => setStep("compose")}
        disabled={quickPosting !== null}
        activeOpacity={0.8}
      >
        <View style={[styles.shareCardIcon, { backgroundColor: "#FFF3E0" }]}>
          <Ionicons name="create-outline" size={24} color="#FF9500" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.shareCardTitle}>Custom post</Text>
          <Text style={styles.shareCardSub}>Write a caption, add a photo</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DonateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [org, setOrg] = useState<Nonprofit | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [step, setStep] = useState<Step>("amount");
  const [amountCents, setAmountCents] = useState(0);
  const [donationId, setDonationId] = useState("");
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    api.nonprofits.get(id).then(setOrg).catch(() => {}).finally(() => setLoadingOrg(false));
  }, [id]);

  async function handlePay(cents: number) {
    try {
      const { url } = await api.stripe.createCheckoutSession(id, cents);
      setAmountCents(cents);
      await Linking.openURL(url);
      // After Stripe checkout the user returns via the deep link success_url
      // which routes to /donation/success. No step transition here.
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      Alert.alert("Error", msg);
    }
  }

  if (loadingOrg || !org) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={COLORS.brand} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        {step === "amount" ? (
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.gray700} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backCircle} />
        )}
        <Text style={styles.topBarTitle}>
          {step === "amount" ? "Choose amount" : "Your impact"}
        </Text>
        {!posted && (
          <TouchableOpacity style={styles.closeCircle} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={COLORS.gray600} />
          </TouchableOpacity>
        )}
        {posted && <View style={styles.closeCircle} />}
      </View>

      {step === "amount" && (
        <AmountStep org={org} user={user} onPay={handlePay} />
      )}

      {step === "share" && (
        <ShareStep
          org={org}
          amountCents={amountCents}
          donationId={donationId}
          user={user}
          onPosted={() => setPosted(true)}
          onDone={() => router.replace("/(tabs)")}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topBarTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: COLORS.gray900 },
  backCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  closeCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.gray100, alignItems: "center", justifyContent: "center",
  },

  // Org card
  orgCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.white, borderRadius: 16, padding: 14,
    marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  orgLogo: { width: 56, height: 56, borderRadius: 14, borderWidth: 1.5 },
  orgName: { fontSize: 16, fontWeight: "700", color: COLORS.gray900, flex: 1 },
  catPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start", marginTop: 4,
  },
  catPillText: { fontSize: 11, fontWeight: "700" },

  // Amount step
  amountContent: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4 },
  amountDisplay: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "center",
    paddingVertical: 28, gap: 4,
  },
  dollarSign: { fontWeight: "700", color: COLORS.gray400 },
  amountBig: { fontWeight: "800", color: COLORS.gray900, letterSpacing: -2, minWidth: 44 },
  quickRow: {
    flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 20,
  },
  quickChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.gray100,
  },
  quickChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  quickChipText: { fontSize: 15, fontWeight: "700", color: COLORS.gray700 },
  quickChipTextActive: { color: COLORS.white },
  paymentRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  paymentBrandBadge: {
    width: 42, height: 28, borderRadius: 6,
    alignItems: "center", justifyContent: "center",
  },
  paymentBrandText: { fontSize: 11, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },
  paymentLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.gray800 },
  authBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  authIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  authBannerTitle: { fontSize: 13, fontWeight: "700", color: COLORS.gray800 },
  authBannerSub: { fontSize: 12, color: COLORS.gray500, marginTop: 1 },
  stripeNote: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingTop: 4,
  },
  stripeNoteText: { fontSize: 12, color: COLORS.gray400 },
  bottomBar: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 20, paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.gray100,
  },
  donateBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.brand, borderRadius: 16, paddingVertical: 16, gap: 8,
    shadowColor: COLORS.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  donateBtnDisabled: { backgroundColor: COLORS.gray200, shadowOpacity: 0 },
  donateBtnText: { fontSize: 16, fontWeight: "800", color: COLORS.white },
  backBtn: {
    paddingHorizontal: 20, borderRadius: 16, paddingVertical: 16,
    backgroundColor: COLORS.gray100, alignItems: "center", justifyContent: "center",
  },
  backBtnText: { fontSize: 15, fontWeight: "700", color: COLORS.gray600 },

  // Share step
  shareContent: {
    alignItems: "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40,
  },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center",
    marginBottom: 20,
    shadowColor: COLORS.brand, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  shareTitle: { fontSize: 26, fontWeight: "800", color: COLORS.gray900, textAlign: "center" },
  shareSub: { fontSize: 15, color: COLORS.gray500, marginTop: 4, marginBottom: 20 },
  shareQuestion: { fontSize: 15, fontWeight: "600", color: COLORS.gray700, marginBottom: 14, textAlign: "center" },
  shareCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: COLORS.white, borderRadius: 18, padding: 18,
    width: "100%", marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  shareCardIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  shareCardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray900 },
  shareCardSub: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },

  // Compose
  composeContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  postPreview: {
    backgroundColor: COLORS.white, borderRadius: 18, overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  postPreviewHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 14,
  },
  postAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center",
  },
  postPreviewName: { fontSize: 14, fontWeight: "700", color: COLORS.gray900 },
  postPreviewSub: { fontSize: 12, color: COLORS.gray500, marginTop: 1 },
  postPhoto: { width: "100%", height: 200 },
  photoPlaceholder: {
    height: 160, alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.gray50, gap: 8,
  },
  photoPlaceholderText: { fontSize: 13, color: COLORS.gray400, fontWeight: "500" },
  captionInput: {
    padding: 14, fontSize: 14, color: COLORS.gray800, minHeight: 60, textAlignVertical: "top",
  },
  toggleRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  toggleLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: COLORS.gray800 },
  toggleSub: { fontSize: 12, color: COLORS.gray400, marginTop: 1 },

  // Done
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 8 },
  doneTitle: { fontSize: 28, fontWeight: "800", color: COLORS.gray900 },
  doneSub: { fontSize: 15, color: COLORS.gray500 },
  doneBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.brand, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 48,
    marginTop: 16,
    shadowColor: COLORS.brand, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
});
