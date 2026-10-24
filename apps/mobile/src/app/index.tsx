import { coverBackground } from "@datewise/tokens";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Temporary token check: mirrors the web page so both can be compared side by side.
// Replaced by the real Plan a date screen in Phase 2.
export default function Home() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerClassName="gap-6 px-4 pb-12"
      contentContainerStyle={{ paddingTop: insets.top + 16 }}
    >
      <View
        className="h-40 justify-end rounded-lg p-4 overflow-hidden"
        style={{ backgroundImage: coverBackground("adventurous") }}
      >
        <Text className="font-display text-display-xl text-white">Saturday in Lekki</Text>
      </View>

      <View className="gap-2">
        <Text className="font-body text-label uppercase text-ink-3">Tokens</Text>
        <Text className="font-display text-display text-ink">Plan a date</Text>
        <Text className="font-body text-body text-ink-2">
          Free entry and four floors to wander before it gets busy.
        </Text>
        <Text className="font-mono text-data text-ink-2">16:00 → 17:45 · 14 min · 5.1 km</Text>
        <Text className="font-body text-caption font-semibold text-secondary-text">Open in Maps</Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Text className="rounded-pill border border-primary bg-primary-subtle px-3 py-1.5 font-body text-caption font-semibold text-primary">
          Adventurous
        </Text>
        <Text className="rounded-pill bg-surface-2 px-3 py-1.5 font-body text-caption font-semibold text-success">
          Ready
        </Text>
        <Text className="rounded-pill bg-surface-2 px-3 py-1.5 font-body text-caption font-semibold text-danger">
          Out of credits
        </Text>
      </View>

      <Pressable className="flex-row items-center justify-center gap-2 rounded-pill bg-primary py-4 active:bg-primary-press">
        <Text className="font-display text-heading text-on-primary">Generate plan</Text>
        <Text className="font-mono text-data text-on-primary opacity-70">1 credit</Text>
      </Pressable>
    </ScrollView>
  );
}
