import { Tabs, useRouter } from "expo-router";
import { useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { COLORS } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_CONFIG: { name: string; icon: IoniconName; activeIcon: IoniconName; label: string }[] = [
  { name: "index",    icon: "home-outline",    activeIcon: "home",    label: "Home" },
  { name: "discover", icon: "search-outline",  activeIcon: "search",  label: "Discover" },
  { name: "tax",      icon: "receipt-outline", activeIcon: "receipt", label: "Tax" },
  { name: "profile",  icon: "person-outline",  activeIcon: "person",  label: "Profile" },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const routeNames = state.routes.map((r) => r.name);

  // Split into left 2 and right 2
  const left = TAB_CONFIG.slice(0, 2);
  const right = TAB_CONFIG.slice(2);

  function goTo(name: string) {
    const idx = routeNames.indexOf(name);
    const route = state.routes[idx];
    if (!route) return;
    const isFocused = state.index === idx;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(name);
    }
  }

  function TabItem({ tab }: { tab: typeof TAB_CONFIG[number] }) {
    const idx = routeNames.indexOf(tab.name);
    const focused = state.index === idx;
    return (
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => goTo(tab.name)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={focused ? tab.activeIcon : tab.icon}
          size={23}
          color={focused ? COLORS.brand : COLORS.gray400}
        />
        <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {/* Left tabs */}
        <View style={styles.side}>
          {left.map((tab) => <TabItem key={tab.name} tab={tab} />)}
        </View>

        {/* Center donate FAB */}
        <View style={styles.centerSlot}>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push("/donate")}
            activeOpacity={0.85}
          >
            <Ionicons name="heart" size={26} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Right tabs */}
        <View style={styles.side}>
          {right.map((tab) => <TabItem key={tab.name} tab={tab} />)}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && !user.usernameSet) {
      router.replace("/onboarding/username");
    } else if (user && user.usernameSet && !user.onboardingComplete) {
      router.replace("/onboarding/interests");
    }
  }, [user, loading]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.white },
        headerTitleStyle: { color: COLORS.gray900, fontWeight: "700", fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index"    options={{ headerTitle: "GiveStream" }} />
      <Tabs.Screen name="discover" options={{ headerTitle: "Discover" }} />
      <Tabs.Screen name="tax"      options={{ headerTitle: "Tax Center" }} />
      <Tabs.Screen name="profile"  options={{ headerTitle: "Profile" }} />
    </Tabs>
  );
}

const FAB_SIZE = 62;
const BAR_HEIGHT = 64;
const BOTTOM_INSET = Platform.OS === "ios" ? 28 : 12;

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: BOTTOM_INSET,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 24,
    height: BAR_HEIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  side: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.gray400,
  },
  tabLabelActive: {
    color: COLORS.brand,
  },
  centerSlot: {
    width: FAB_SIZE + 16,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -(FAB_SIZE / 2),
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
});
