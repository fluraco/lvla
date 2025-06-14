import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation';
import { GirisScreen } from '../screens/auth/GirisScreen';
import { KayitScreen } from '../screens/auth/KayitScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { RegisterProvider } from '../contexts/RegisterContext';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <RegisterProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Giris" component={GirisScreen} />
        <Stack.Screen name="Kayit" component={KayitScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
      </Stack.Navigator>
    </RegisterProvider>
  );
} 