import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StripeProvider } from "@stripe/stripe-react-native";
import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StripeProvider
          publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
          merchantIdentifier="merchant.com.givestream.app"
        >
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="donate"
              options={{ headerShown: false, presentation: "modal" }}
            />
            <Stack.Screen
              name="nonprofit/[id]"
              options={{ headerShown: true, title: "", headerBackButtonDisplayMode: "minimal", presentation: "card" }}
            />
            <Stack.Screen
              name="donation/success"
              options={{ headerShown: true, title: "Donation Confirmed", presentation: "modal" }}
            />
            <Stack.Screen
              name="profile/[username]"
              options={{ headerShown: false, presentation: "card" }}
            />
            <Stack.Screen
              name="profile/change-username"
              options={{ headerShown: false, presentation: "card" }}
            />
            <Stack.Screen
              name="auth/signin"
              options={{ headerShown: false, presentation: "modal" }}
            />
            <Stack.Screen
              name="onboarding"
              options={{ headerShown: false }}
            />
          </Stack>
        </StripeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
