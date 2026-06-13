/** Dolna nawigacja — 5 zakładek po polsku. */
import React from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/theme';
import type { IconName } from '@/components/Icon';

export default function TabsLayout() {
  const { c } = useTheme();

  const icon =
    (name: IconName) =>
    ({ color, size }: { color: ColorValue; size: number }) =>
      <Ionicons name={name} size={size} color={color as string} />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
        },
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 22 },
        headerShadowVisible: false,
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Trening', tabBarIcon: icon('barbell') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Historia', tabBarIcon: icon('time') }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: 'Ćwiczenia', tabBarIcon: icon('list') }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Statystyki', tabBarIcon: icon('stats-chart') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: icon('person') }}
      />
    </Tabs>
  );
}
