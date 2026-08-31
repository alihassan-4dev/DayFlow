import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PreferencesProvider } from '../src/state/PreferencesContext';
import { onNotificationOpened, syncPushPreferences } from '../src/services/notifications';
import { usePreferences } from '../src/state/PreferencesContext';
import { TasksProvider } from '../src/state/TasksContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { theme } = useTheme();
  const { prefs, ready } = usePreferences();
  const router = useRouter();

  useEffect(() => onNotificationOpened(() => router.push('/(main)/tasks')), [router]);

  useEffect(() => {
    if (ready) void syncPushPreferences(prefs);
  }, [
    ready,
    prefs.notificationsEnabled,
    prefs.notificationTone,
    prefs.remindBefore,
    prefs.quietHoursEnabled,
    prefs.quietStart,
    prefs.quietEnd,
    prefs.dailySummary,
    prefs.dailySummaryTime,
  ]);

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(main)" />
        <Stack.Screen
          name="task-editor"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PreferencesProvider>
          <TasksProvider>
            <RootNavigator />
          </TasksProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
