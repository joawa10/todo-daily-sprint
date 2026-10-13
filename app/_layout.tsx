import { useCallback } from 'react';
import { Platform } from 'react-native';
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { useTheme } from '@/hooks/useTheme';
import { useRolloverGuard } from '@/hooks/useRolloverGuard';
import { useWidgetSync } from '@/hooks/useWidgetSync';
import { useTasks } from '@/store/useTasks';

void SplashScreen.preventAutoHideAsync();

function Navigator() {
  const theme = useTheme();
  const pathname = usePathname();
  const navigationState = useRootNavigationState();
  const router = useRouter();
  useRolloverGuard(true, pathname, !!navigationState?.key, router);
  useWidgetSync();

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task-editor" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="review" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="history" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="backup" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const hasHydrated = useTasks((state) => state.hasHydrated);
  const [fontsLoaded] = useFonts(
    Platform.OS === 'android'
      ? {}
      : {
          BricolageGrotesque_400Regular,
          BricolageGrotesque_600SemiBold,
          BricolageGrotesque_800ExtraBold,
        },
  );
  const ready = fontsLoaded && hasHydrated;

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <Navigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
