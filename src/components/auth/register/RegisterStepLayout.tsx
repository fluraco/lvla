import React, { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-elements';
import { SPACING, TYPOGRAPHY } from '../../../theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Progress from 'react-native-progress';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../../theme';

interface RegisterStepLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onSkip?: () => void;
  isNextDisabled?: boolean;
  loading?: boolean;
  showSkip?: boolean;
}

export function RegisterStepLayout({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps,
  onNext,
  onSkip,
  isNextDisabled = false,
  loading = false,
  showSkip = false,
}: RegisterStepLayoutProps) {
  const progress = currentStep / totalSteps;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <Progress.Bar
            progress={progress}
            width={null}
            height={3}
            color="#0066FF"
            unfilledColor="#E5E5E5"
            borderWidth={0}
          />
        </View>

        <View style={styles.titleContainer}>
          <Animated.Text 
            entering={FadeInDown.delay(200)}
            style={styles.title}
          >
            {title}
          </Animated.Text>
          {subtitle && (
            <Animated.Text 
              entering={FadeInDown.delay(300)}
              style={styles.subtitle}
            >
              {subtitle}
            </Animated.Text>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {children}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={onNext}
          disabled={isNextDisabled || loading}
          style={[
            styles.continueButton,
            (isNextDisabled || loading) && styles.continueButtonDisabled
          ]}
        >
          <Text style={[
            styles.continueButtonText,
            (isNextDisabled || loading) && styles.continueButtonTextDisabled
          ]}>
            Devam et
          </Text>
        </TouchableOpacity>

        {showSkip && (
          <TouchableOpacity
            onPress={onSkip}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>
              Atla
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  progressContainer: {
    paddingTop: SPACING.md,
  },
  titleContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '400',
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  continueButton: {
    height: 56,
    backgroundColor: '#0066FF',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#999999',
  },
  skipButton: {
    height: 56,
    backgroundColor: '#F8F9FA',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
}); 