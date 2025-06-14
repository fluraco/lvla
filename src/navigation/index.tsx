import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { useUser } from '../contexts/UserContext';
import { useAnnouncements } from '../contexts/AnnouncementContext';
import { AnnouncementModal } from '../components/modals/AnnouncementModal';

// Auth Screens
import { GirisScreen } from '../screens/auth/GirisScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { KayitScreen } from '../screens/auth/KayitScreen';

// Main Screens
import { ChatDetailScreen } from '../screens/main/chat/ChatDetailScreen';

// Profile Screens
import { 
  UserProfileScreen, 
  EditProfileScreen, 
  AppSettingsScreen, 
  PrivacySecurityScreen, 
  NotificationSettingsScreen, 
  SupportRequestScreen,
  AboutScreen,
  TermsOfServiceScreen,
  PrivacyPolicyScreen,
  BlockedAccountsScreen,
  SuperLikeScreen,
  CreditScreen,
  PremiumScreen,
  ConsumablesShopScreen
} from '../screens/main/profile';

// Boost ve SuperLike Screens
import { BoostScreen } from '../screens/main/boost/BoostScreen';

// Navigation
import { MainTabNavigator } from './MainTabNavigator';

// Types
import { RootStackParamList, AuthStackParamList, ChatStackParamList } from '../types/navigation';

const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const ChatStack = createStackNavigator<ChatStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Giris"
    >
      <AuthStack.Screen name="Giris" component={GirisScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
      <AuthStack.Screen name="Kayit" component={KayitScreen} />
    </AuthStack.Navigator>
  );
}

// Ana tab navigatörünü saran ve chat detay sayfasını içeren navigator
export function ChatStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="SupportRequest" component={SupportRequestScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="BlockedAccounts" component={BlockedAccountsScreen} />
      <Stack.Screen name="BoostScreen" component={BoostScreen} />
      <Stack.Screen name="SuperLikeScreen" component={SuperLikeScreen} />
      <Stack.Screen name="CreditScreen" component={CreditScreen} />
      <Stack.Screen name="PremiumScreen" component={PremiumScreen} />
      <Stack.Screen name="ConsumablesShopScreen" component={ConsumablesShopScreen} />
    </Stack.Navigator>
  );
}

export function Navigation() {
  const { user, isLoading } = useUser();
  const { 
    showAnnouncementModal, 
    setShowAnnouncementModal, 
    currentAnnouncement, 
    fetchAnnouncements 
  } = useAnnouncements();

  console.log('Navigation: Kullanıcı durumu -', user ? `Oturum açık (${user.id})` : 'Oturum kapalı');

  // Kullanıcı giriş yaptığında duyuruları getir
  useEffect(() => {
    if (user) {
      console.log('Duyurular kontrol ediliyor...');
      fetchAnnouncements();
    }
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  // Duyuru modalını kapat
  const handleCloseAnnouncement = () => {
    setShowAnnouncementModal(false);
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen 
              name="MainTabs" 
              component={ChatStackNavigator} 
              options={{ gestureEnabled: false }} 
            />
            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
            <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="SupportRequest" component={SupportRequestScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="BlockedAccounts" component={BlockedAccountsScreen} />
            <Stack.Screen name="BoostScreen" component={BoostScreen} />
            <Stack.Screen name="SuperLikeScreen" component={SuperLikeScreen} />
            <Stack.Screen name="CreditScreen" component={CreditScreen} />
            <Stack.Screen name="PremiumScreen" component={PremiumScreen} />
            <Stack.Screen name="ConsumablesShopScreen" component={ConsumablesShopScreen} />
          </>
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator} 
            options={{ gestureEnabled: false }} 
          />
        )}
      </Stack.Navigator>

      {/* Duyuru Modalı */}
      <AnnouncementModal 
        visible={showAnnouncementModal}
        onClose={handleCloseAnnouncement}
        announcement={currentAnnouncement}
      />
    </NavigationContainer>
  );
} 