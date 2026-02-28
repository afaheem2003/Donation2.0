import { Stack } from "expo-router";
import { COLORS } from "@/lib/utils";

export default function DonateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    />
  );
}
