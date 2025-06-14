import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Text } from 'react-native-elements';
import { useRegister } from '../../../contexts/RegisterContext';
import { SPACING } from '../../../theme';
import { RegisterStepLayout } from './RegisterStepLayout';

const MAX_CHARS = 500;
const PLACEHOLDER_TEXT = 'Örnek: Merhaba! Ben spor yapmayı ve yeni yerler keşfetmeyi seven biriyim...';

export function BiographyStep() {
  const { state, dispatch } = useRegister();
  const [biography, setBiography] = useState(state.biography);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (biography?.trim()) {
        dispatch({ type: 'SET_BIOGRAPHY', payload: biography.trim() });
      }
      dispatch({ type: 'NEXT_STEP' });
    } catch (error) {
      console.error('Biyografi kaydetme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterStepLayout
      title="Kendinden bahset"
      subtitle="İnsanların seni daha iyi tanıması için kendinden bahset"
      currentStep={7}
      totalSteps={8}
      onNext={handleNext}
      loading={loading}
    >
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          multiline
          placeholder={PLACEHOLDER_TEXT}
          placeholderTextColor="#999"
          value={biography}
          onChangeText={setBiography}
          maxLength={MAX_CHARS}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>
          {biography?.length || 0}/{MAX_CHARS}
        </Text>
      </View>
    </RegisterStepLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: SPACING.lg,
    fontSize: 16,
    color: '#000',
    minHeight: 200,
  },
  charCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    marginTop: SPACING.sm,
  },
}); 