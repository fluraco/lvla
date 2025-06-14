import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Dimensions,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-elements';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, LAYOUT, ANIMATIONS } from '../../../theme';
import Animated, { 
  FadeInRight, 
  FadeOutLeft,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface RegisterStepContainerProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  nextButtonTitle?: string;
  isNextDisabled?: boolean;
  showSkip?: boolean;
  loading?: boolean;
}

function AnimatedButton({ 
  onPress, 
  title, 
  gradient, 
  disabled, 
  loading,
  icon,
  style,
  textStyle,
}: { 
  onPress: () => void;
  title: string;
  gradient?: string[];
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: any;
  textStyle?: any;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const loadingIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, ANIMATIONS.spring);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, ANIMATIONS.spring);
  };

  const startLoadingAnimation = () => {
    rotation.value = withSequence(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      withTiming(0, { duration: 0 }),
    );
  };

  React.useEffect(() => {
    if (loading) {
      startLoadingAnimation();
      const interval = setInterval(startLoadingAnimation, 1000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.buttonBase,
          disabled && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
      >
        <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={gradient || ['transparent', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.8 }]}
          />
        </BlurView>
        <View style={styles.buttonContent}>
          {loading ? (
            <Animated.View style={loadingIconStyle}>
              <MaterialCommunityIcons
                name="loading"
                size={24}
                color={gradient ? colors.white : colors.primary}
                style={styles.buttonIcon}
              />
            </Animated.View>
          ) : icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={24}
              color={gradient ? colors.white : colors.primary}
              style={styles.buttonIcon}
            />
          ) : null}
          <Text style={[
            gradient ? styles.buttonTextLight : styles.buttonTextDark,
            textStyle,
          ]}>
            {loading ? 'Yükleniyor...' : title}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function RegisterStepContainer({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  nextButtonTitle = 'Devam Et',
  isNextDisabled = false,
  showSkip = false,
  loading = false,
}: RegisterStepContainerProps) {
  const { colors } = useTheme();
  const progress = ((currentStep) / totalSteps) * 100;
  const progressAnimation = useSharedValue(0);

  React.useEffect(() => {
    progressAnimation.value = withTiming(progress, {
      duration: ANIMATIONS.transition.duration,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value}%`,
  }));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          entering={FadeInRight} 
          exiting={FadeOutLeft}
          style={styles.content}
        >
          {/* Progress Bar */}
          <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
            <Animated.View style={[styles.progressBar, progressStyle]}>
              <LinearGradient
                colors={colors.gradient.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, { opacity: 0.9 }]}
              />
              <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <BlurView intensity={60} tint="light" style={styles.headerBlur}>
              <Animated.Text 
                entering={FadeIn} 
                exiting={FadeOut}
                style={[styles.title, { color: colors.text }]}
              >
                {title}
              </Animated.Text>
              {subtitle && (
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {subtitle}
                </Text>
              )}
            </BlurView>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {children}
          </View>

          {/* Footer */}
          <BlurView intensity={80} tint="light" style={styles.footer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.buttonContainer}>
              {currentStep > 1 && (
                <AnimatedButton
                  title="Geri"
                  onPress={onBack}
                  icon="arrow-left"
                  style={styles.backButton}
                />
              )}
              <View style={styles.rightButtons}>
                {showSkip && (
                  <AnimatedButton
                    title="Atla"
                    onPress={onSkip}
                    style={styles.skipButton}
                  />
                )}
                <AnimatedButton
                  title={nextButtonTitle}
                  onPress={onNext}
                  disabled={isNextDisabled}
                  loading={loading}
                  gradient={colors.gradient.primary}
                  icon="arrow-right"
                  style={styles.nextButtonContainer}
                />
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: Math.min(width, LAYOUT.maxWidth),
    alignSelf: 'center',
    ...LAYOUT.container,
  },
  progressContainer: {
    height: 6,
    borderRadius: BORDER_RADIUS.circular,
    overflow: 'hidden',
    marginVertical: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressBar: {
    height: '100%',
    borderRadius: BORDER_RADIUS.circular,
    overflow: 'hidden',
  },
  header: {
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  headerBlur: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  title: {
    ...TYPOGRAPHY.h1,
    textAlign: 'center',
    marginBottom: SPACING.xs,
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    ...TYPOGRAPHY.body1,
    textAlign: 'center',
    opacity: 0.8,
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  footer: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonBase: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  buttonIcon: {
    marginRight: SPACING.xs,
  },
  buttonTextLight: {
    ...TYPOGRAPHY.button,
    color: COLORS.light.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDark: {
    ...TYPOGRAPHY.button,
    color: COLORS.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  backButton: {
    minWidth: 100,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipButton: {
    marginRight: SPACING.md,
  },
  nextButtonContainer: {
    minWidth: 160,
  },
}); 