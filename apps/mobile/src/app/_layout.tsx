import "@/global.css";

import { colors } from "@datewise/tokens";
// Per-weight imports: the package root requires every weight and italic,
// and Metro would ship them all.
import { DMMono_400Regular } from "@expo-google-fonts/dm-mono/400Regular";
import { DMMono_500Medium } from "@expo-google-fonts/dm-mono/500Medium";
import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_500Medium } from "@expo-google-fonts/figtree/500Medium";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import { useFonts } from "expo-font";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

// Keep the splash up until fonts load, so text never flashes in a system font.
SplashScreen.preventAutoHideAsync();

// Navigation draws its own backgrounds and headers, outside NativeWind's reach,
// so it takes token values directly.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.canvas,
    card: colors["surface-1"],
    text: colors.ink,
    border: colors.line,
    primary: colors.primary,
  },
};

export default function RootLayout() {
  // One family per role, several weights each; `fontWeight` picks the file.
  const [loaded, error] = useFonts([
    {
      fontFamily: "Archivo",
      fontDefinitions: [
        // Static Expanded cut (width 125): React Native can't set a variable font's width axis.
        { path: require("@/assets/fonts/ArchivoExpanded-ExtraBold.ttf"), weight: 800 },
      ],
    },
    {
      fontFamily: "Figtree",
      fontDefinitions: [
        { path: Figtree_400Regular, weight: 400 },
        { path: Figtree_500Medium, weight: 500 },
        { path: Figtree_600SemiBold, weight: 600 },
        { path: Figtree_700Bold, weight: 700 },
      ],
    },
    {
      fontFamily: "DM Mono",
      fontDefinitions: [
        { path: DMMono_400Regular, weight: 400 },
        { path: DMMono_500Medium, weight: 500 },
      ],
    },
  ]);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
    </ThemeProvider>
  );
}
