import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaskedTextInput } from 'react-native-mask-text';
import { Text } from 'react-native-elements';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
}

export function PhoneInput({ value, onChangeText, error }: PhoneInputProps) {
  return (
    <View style={styles.container}>
      <MaskedTextInput
        value={value}
        onChangeText={onChangeText}
        mask="0 (999) 999 99 99"
        keyboardType="numeric"
        placeholder="0 (5XX) XXX XX XX"
        style={[
          styles.input,
          error ? styles.inputError : null,
        ]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF4444',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
}); 