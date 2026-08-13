import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { useFavoritesStore } from '@/store/favoritesStore';
import { useReservations } from '@/hooks/useReservations';
import { useTheme } from '@/theme';

/**
 * Bottom tabs.
 *
 * Deliberately no icon animation. These get tapped dozens of times a session,
 * and anything that takes 200ms to settle reads as the app being slow rather
 * than as polish. State change is instant: filled glyph, ink label.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const favoriteCount = useFavoritesStore((s) => s.ids.size);
  const { upcoming } = useReservations();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.ink,
        tabBarInactiveTintColor: theme.colors.inkFaint,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.hairline,
          borderTopWidth: StyleSheet.hairlineWidth * 2,
          height: theme.layout.tabBarHeight + (Platform.OS === 'ios' ? 26 : 8),
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 26 : 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          ...theme.text.caption,
          fontSize: 10.5,
          marginTop: 1,
        },
        tabBarBadgeStyle: {
          backgroundColor: theme.colors.accent,
          color: theme.colors.accentOn,
          fontSize: 10,
          minWidth: 17,
          height: 17,
          lineHeight: 13,
        },
        sceneStyle: { backgroundColor: theme.colors.canvas },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={23} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: 'Bookings',
          tabBarBadge: upcoming.length > 0 ? upcoming.length : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Saved',
          tabBarBadge: favoriteCount > 0 ? favoriteCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={21} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
