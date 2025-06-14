import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput } from 'react-native';
import { useRegister } from '../../../contexts/RegisterContext';
import { RegisterStepLayout } from './RegisterStepLayout';

interface DateInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  keyboardType?: 'numeric' | 'default';
  placeholder?: string;
  inputRef?: React.RefObject<TextInput>;
  onFocus?: () => void;
  autoFocus?: boolean;
}

const DateInput: React.FC<DateInputProps> = ({ 
  label, 
  value, 
  onChangeText, 
  maxLength,
  keyboardType = 'numeric',
  placeholder,
  inputRef,
  onFocus,
  autoFocus
}) => {
  return (
    <View style={styles.dateInput}>
      <Text style={styles.dateInputLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={styles.dateInputValue}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        keyboardType={keyboardType}
        placeholder={placeholder}
        onFocus={onFocus}
        autoFocus={autoFocus}
      />
    </View>
  );
};

export function BirthDateStep() {
  const { dispatch } = useRegister();
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);

  const dayInputRef = useRef<TextInput>(null);
  const monthInputRef = useRef<TextInput>(null);
  const yearInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Sayfa açıldığında gün inputuna focus at
    setTimeout(() => {
      dayInputRef.current?.focus();
    }, 100);
  }, []);

  const validateDate = () => {
    const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 18;
  };

  const handleNext = async () => {
    if (month && day && year && year.length === 4) {
      if (!validateDate()) {
        return;
      }
      
      setLoading(true);
      try {
        const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        await new Promise(resolve => setTimeout(resolve, 500));
        dispatch({ type: 'SET_BIRTH_DATE', payload: birthDate });
        dispatch({ type: 'NEXT_STEP' });
      } catch (error) {
        console.error('Doğum tarihi kaydetme hatası:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDayChange = (text: string) => {
    const numValue = text.replace(/[^0-9]/g, '');
    if (parseInt(numValue) <= 31 || numValue === '') {
      setDay(numValue);
      if (numValue.length === 2 && parseInt(numValue) > 0 && parseInt(numValue) <= 31) {
        monthInputRef.current?.focus();
      }
    }
  };

  const handleMonthChange = (text: string) => {
    const numValue = text.replace(/[^0-9]/g, '');
    if (parseInt(numValue) <= 12 || numValue === '') {
      setMonth(numValue);
      if (numValue.length === 2 && parseInt(numValue) > 0 && parseInt(numValue) <= 12) {
        yearInputRef.current?.focus();
      }
    }
  };

  const handleYearChange = (text: string) => {
    const numValue = text.replace(/[^0-9]/g, '');
    setYear(numValue);
    if (numValue.length === 4) {
      yearInputRef.current?.blur();
    }
  };

  return (
    <RegisterStepLayout
      title="Doğum Tarihi"
      currentStep={7}
      totalSteps={8}
      onNext={handleNext}
      loading={loading}
      isNextDisabled={!month || !day || !year || year.length !== 4}
    >
      <View style={styles.container}>
        <View style={styles.dateInputsContainer}>
          <DateInput
            label="Gün"
            value={day}
            onChangeText={handleDayChange}
            maxLength={2}
            placeholder="31"
            inputRef={dayInputRef}
            autoFocus={true}
          />
          <DateInput
            label="Ay"
            value={month}
            onChangeText={handleMonthChange}
            maxLength={2}
            placeholder="12"
            inputRef={monthInputRef}
          />
          <DateInput
            label="Yıl"
            value={year}
            onChangeText={handleYearChange}
            maxLength={4}
            placeholder="2000"
            inputRef={yearInputRef}
          />
        </View>
      </View>
    </RegisterStepLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dateInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
  },
  dateInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateInputValue: {
    fontSize: 20,
    color: '#000',
    fontWeight: '500',
  }
}); 