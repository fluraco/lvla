import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-elements';
import { useRegister } from '../../../contexts/RegisterContext';
import { SPACING } from '../../../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RegisterStepLayout } from './RegisterStepLayout';

type GenderOption = {
  id: 'male' | 'female';
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const GENDER_OPTIONS: GenderOption[] = [
  { id: 'male', label: 'Erkek', icon: 'gender-male' },
  { id: 'female', label: 'Kadın', icon: 'gender-female' },
];

export function GenderStep() {
  const { state, dispatch } = useRegister();
  const [selectedGender, setSelectedGender] = useState(state.gender);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!selectedGender) return;

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({ type: 'SET_GENDER', payload: selectedGender });
      dispatch({ type: 'NEXT_STEP' });
    } catch (error) {
      console.error('Cinsiyet kaydetme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterStepLayout
      title="Cinsiyetinizi seçin"
      subtitle="Size daha iyi eşleşmeler sunabilmemiz için cinsiyetinizi seçin"
      currentStep={2}
      totalSteps={8}
      onNext={handleNext}
      isNextDisabled={!selectedGender}
      loading={loading}
    >
      <View style={styles.optionsContainer}>
        {GENDER_OPTIONS.map((option, index) => (
          <View
            key={option.id}
            style={styles.optionWrapper}
          >
            <TouchableOpacity
              onPress={() => setSelectedGender(option.id)}
              style={styles.optionButton}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.radioButton,
                  selectedGender === option.id && styles.radioButtonSelected
                ]}>
                  {selectedGender === option.id && <View style={styles.radioButtonInner} />}
                </View>
                <MaterialCommunityIcons
                  name={option.icon}
                  size={32}
                  color={selectedGender === option.id ? '#0066FF' : '#666'}
                  style={styles.optionIcon}
                />
                <Text style={[
                  styles.optionText,
                  selectedGender === option.id && styles.optionTextSelected
                ]}>
                  {option.label}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </RegisterStepLayout>
  );
}

const styles = StyleSheet.create({
  optionsContainer: {
    gap: SPACING.md,
  },
  optionWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionButton: {
    padding: SPACING.lg,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#0066FF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0066FF',
  },
  optionIcon: {
    width: 32,
    height: 32,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  optionTextSelected: {
    color: '#0066FF',
    fontWeight: '600',
  },
}); 