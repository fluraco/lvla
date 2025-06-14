import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Text } from 'react-native-elements';
import { useRegister } from '../../../contexts/RegisterContext';
import { SPACING } from '../../../theme';
import { RegisterStepLayout } from './RegisterStepLayout';

interface Errors {
  firstName?: string;
  lastName?: string;
}

export function NamesStep() {
  const { state, dispatch } = useRegister();
  const [firstName, setFirstName] = useState(state.firstName);
  const [lastName, setLastName] = useState(state.lastName);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  // Google ile giriş yaptıysa isim alanlarını doldur
  useEffect(() => {
    if (state.isGoogleSignup && state.firstName && state.lastName) {
      setFirstName(state.firstName);
      setLastName(state.lastName);
    }
  }, [state.isGoogleSignup, state.firstName, state.lastName]);

  const validate = () => {
    const newErrors: Errors = {};
    if (!firstName.trim()) {
      newErrors.firstName = 'İsim alanı boş bırakılamaz';
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'Soyisim alanı boş bırakılamaz';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      dispatch({
        type: 'SET_NAMES',
        payload: { firstName: firstName.trim(), lastName: lastName.trim() },
      });
      dispatch({ type: 'NEXT_STEP' });
    } catch (error) {
      console.error('İsim kaydetme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterStepLayout
      title="Sizi Tanıyalım"
      subtitle={state.isGoogleSignup 
        ? "Google hesabınızdan aldığımız bilgiler. Değiştirebilirsiniz."
        : "İnsanların sizi tanıması için isminizi girin."}
      currentStep={1}
      totalSteps={8}
      onNext={handleNext}
      isNextDisabled={!firstName.trim() || !lastName.trim()}
      loading={loading}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Image 
            source={require('../../../assets/icons/id-card.png')}
            style={styles.idIcon}
          />
        </View>

        {state.isGoogleSignup && (
          <View style={styles.googleInfoContainer}>
            <Text style={styles.googleInfoText}>
              Google hesabınızdan alınan bilgiler otomatik dolduruldu. İsterseniz düzenleyebilirsiniz.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="İsim"
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                setErrors((prev) => ({ ...prev, firstName: '' }));
              }}
              style={styles.input}
              placeholderTextColor="#999"
              autoFocus={!state.isGoogleSignup}
              returnKeyType="next"
            />
            <Text style={styles.inputHelper}>
              Örn: Ahmet
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Soyisim"
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                setErrors((prev) => ({ ...prev, lastName: '' }));
              }}
              style={styles.input}
              placeholderTextColor="#999"
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </RegisterStepLayout>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: SPACING.xl,
  },
  idIcon: {
    width: 40,
    height: 40,
  },
  form: {
    gap: SPACING.lg,
  },
  inputContainer: {
    gap: SPACING.xs,
  },
  input: {
    height: 56,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: SPACING.lg,
    fontSize: 16,
    color: '#000',
  },
  inputHelper: {
    fontSize: 14,
    color: '#666',
    marginLeft: SPACING.sm,
    fontWeight: '400',
  },
  googleInfoContainer: {
    backgroundColor: '#e6effd',
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#0066ff',
  },
  googleInfoText: {
    fontSize: 14,
    color: '#0066ff',
    lineHeight: 20,
  },
}); 