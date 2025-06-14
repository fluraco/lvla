import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRegister } from '../../contexts/RegisterContext';
import { NamesStep } from '../../components/auth/register/NamesStep';
import { GenderStep } from '../../components/auth/register/GenderStep';
import { InterestedInStep } from '../../components/auth/register/InterestedInStep';
import { LocationStep } from '../../components/auth/register/LocationStep';
import { HobbiesStep } from '../../components/auth/register/HobbiesStep';
import { BiographyStep } from '../../components/auth/register/BiographyStep';
import { BirthDateStep } from '../../components/auth/register/BirthDateStep';
import { PhotosStep } from '../../components/auth/register/PhotosStep';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Kayit'>;

export function KayitScreen({ route }: Props) {
  const { state, dispatch } = useRegister();
  const { phoneNumber } = route.params;

  useEffect(() => {
    dispatch({ type: 'SET_PHONE_NUMBER', payload: phoneNumber });
  }, [phoneNumber]);

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <NamesStep />;
      case 2:
        return <GenderStep />;
      case 3:
        return <InterestedInStep />;
      case 4:
        return <LocationStep />;
      case 5:
        return <HobbiesStep />;
      case 6:
        return <BiographyStep />;
      case 7:
        return <BirthDateStep />;
      case 8:
        return <PhotosStep />;
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>{renderStep()}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
}); 