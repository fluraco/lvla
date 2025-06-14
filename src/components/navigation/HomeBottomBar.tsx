import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../../theme';
import { useNavigation } from '@react-navigation/native';

interface TabItem {
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  route: string;
}

const TABS: TabItem[] = [
  { name: 'home', icon: 'cards', label: 'Keşfet', route: 'Home' },
  { name: 'likes', icon: 'heart', label: 'Beğenenler', route: 'Likes' },
  { name: 'chat', icon: 'chat', label: 'Sohbet', route: 'Chat' },
  { name: 'profile', icon: 'account', label: 'Profil', route: 'Profile' },
];

export function HomeBottomBar() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = React.useState('home');

  const handleTabPress = (tab: TabItem) => {
    setActiveTab(tab.name);
    // navigation.navigate(tab.route);
    console.log(`${tab.route} pressed`);
  };

  return (
    <View style={styles.container}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={[
            styles.tab,
            activeTab === tab.name && styles.activeTab,
          ]}
          onPress={() => handleTabPress(tab)}
        >
          <MaterialCommunityIcons
            name={tab.icon}
            size={24}
            color={activeTab === tab.name ? COLORS.light.primary : COLORS.light.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === tab.name && styles.activeTabLabel,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: 'rgba(0,102,255,0.1)',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: COLORS.light.textSecondary,
  },
  activeTabLabel: {
    color: COLORS.light.primary,
    fontWeight: '600',
  },
}); 