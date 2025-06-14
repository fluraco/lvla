import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';

// Main Screens
import { HomeScreen } from '../screens/main/home/HomeScreen';
import { ChatScreen } from '../screens/main/chat/ChatScreen';
import { LikesScreen } from '../screens/main/likes/LikesScreen';
import { ProfileScreen } from '../screens/main/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.dark.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.dark.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.3,
          shadowRadius: 3,
          elevation: 10,
        },
        tabBarActiveTintColor: COLORS.dark.primary,
        tabBarInactiveTintColor: COLORS.dark.textSecondary,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cards" size={size} color={color} />
          ),
          tabBarLabel: 'Keşfet',
        }}
      />
      <Tab.Screen
        name="Likes"
        component={LikesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart" size={size} color={color} />
          ),
          tabBarLabel: 'Beğeniler',
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat" size={size} color={color} />
          ),
          tabBarLabel: 'Sohbet',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
          tabBarLabel: 'Profil',
        }}
      />
    </Tab.Navigator>
  );
} 