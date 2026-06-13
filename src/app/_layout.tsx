/**
 * Root layout. Inicjalizuje bazę (seed), ładuje ustawienia, montuje motyw
 * i konfiguruje nawigację (taby + ekrany modalne/stack).
 */
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';

import { getDb } from '@/db/client';
import { useSettings } from '@/store/settings';
import { AppThemeProvider, useTheme } from '@/theme';
import { configureNotifications, ensureNotificationPermission } from '@/lib/notifications';

function Navigator() {
  const { c, dark } = useTheme();
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: c.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/active" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="workout/[id]" options={{ title: 'Trening' }} />
        <Stack.Screen name="routine/edit" options={{ presentation: 'modal', title: 'Rutyna' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: 'Ćwiczenie' }} />
        <Stack.Screen name="achievements" options={{ title: 'Osiągnięcia' }} />
        <Stack.Screen name="tools" options={{ title: 'Narzędzia' }} />
        <Stack.Screen name="records" options={{ title: 'Rekordy' }} />
        <Stack.Screen name="exercise/picker" options={{ presentation: 'modal', title: 'Dodaj ćwiczenie' }} />
        <Stack.Screen name="exercise/new" options={{ presentation: 'modal', title: 'Nowe ćwiczenie' }} />
        <Stack.Screen name="measurement/new" options={{ presentation: 'modal', title: 'Pomiar ciała' }} />
        <Stack.Screen name="measurement/progress" options={{ title: 'Pomiary ciała' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const loadSettings = useSettings((s) => s.load);
  const themeMode = useSettings((s) => s.settings?.theme ?? 'system');

  useEffect(() => {
    // Inicjalizacja DB jest synchroniczna (expo-sqlite sync API) — wykonujemy raz.
    try {
      getDb();
      loadSettings();
      // Powiadomienia o końcu odpoczynku (lokalne — działają w Expo Go).
      configureNotifications();
      ensureNotificationPermission();
    } finally {
      setReady(true);
    }
  }, [loadSettings]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B0C0F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#FF6B2C" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider mode={themeMode as never}>
          <Navigator />
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
