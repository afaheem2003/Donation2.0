import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="nonprofit/[id]"
            options={{ headerShown: true, title: "", presentation: "card" }}
          />
          <Stack.Screen
            name="donation/success"
            options={{ headerShown: true, title: "Donation Confirmed", presentation: "modal" }}
          />
          <Stack.Screen
            name="auth/signin"
            options={{ headerShown: false, presentation: "modal" }}
          />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
