import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  UserProfile: {
    userId: string;
    userName: string;
    userAvatar: string;
  };
  ChatDetail: {
    conversationId: string;
    userName: string;
    userAvatar: string;
  };
  EditProfile: undefined;
  AppSettings: undefined;
  PrivacySecurity: undefined;
  NotificationSettings: undefined;
  ChangePassword: undefined;
  SupportRequest: undefined;
  About: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  BlockedAccounts: undefined;
  BoostScreen: undefined;
  SuperLikeScreen: undefined;
  CreditScreen: undefined;
  PremiumScreen: undefined;
  ConsumablesShopScreen: { initialTab?: 'boost' | 'superlike' | 'credit' };
};

export type ChatStackParamList = {
  Tabs: undefined;
  ChatDetail: {
    conversationId: string;
    userName: string;
    userAvatar: string;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Likes: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Giris: undefined;
  Otp: {
    phoneNumber: string;
  };
  Kayit: {
    phoneNumber: string;
  };
}; 