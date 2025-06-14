import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ScaledText } from '../../../components/common/ScaledText';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import * as Haptics from 'expo-haptics';

export function AboutScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Destek talebi sayfasına yönlendirme
  const navigateToSupportRequest = () => {
    navigation.navigate('SupportRequest' as never);
  };

  // Kullanım şartları sayfasına yönlendirme
  const navigateToTermsOfService = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('TermsOfService' as never);
  };

  // Gizlilik politikası sayfasına yönlendirme
  const navigateToPrivacyPolicy = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('PrivacyPolicy' as never);
  };

  // E-posta adresine tıklandığında e-posta uygulamasını açma
  const handleEmailPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:lovla.iletisim@gmail.com')
      .catch(() => {
        Alert.alert('Hata', 'E-posta uygulaması açılamadı.');
      });
  };

  // Geri butonu
  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <LinearGradient
      colors={['#1A1A1A', '#121212']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" translucent={false} />
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 15 : 25 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={handleGoBack} 
              style={styles.backButton}
            >
              <MaterialCommunityIcons 
                name="arrow-left" 
                size={24} 
                color={COLORS.dark.text} 
              />
            </TouchableOpacity>
            <ScaledText style={styles.headerTitle}>Hakkında</ScaledText>
            <View style={{ width: 24 }} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <ScaledText style={styles.logoText}>Lovla</ScaledText>
          </View>

          {/* Uygulama Hakkında */}
          <View style={styles.aboutContainer}>
            <ScaledText style={styles.aboutText}>
              Lovla, sevgi dolu ilişkiler kurmanızı sağlayan modern bir tanışma uygulamasıdır. 
              Benzersiz eşleşme algoritması ve güvenli iletişim özellikleriyle, 
              gerçek ve anlamlı bağlantılar kurmanızı hedefler.
              {'\n\n'}
              Uygulamamız, kullanıcılarının güvenliğini ve memnuniyetini her zaman ön planda tutar. 
              Lovla ile tanışma deneyiminizi keyifli ve güvenli bir şekilde yaşayabilirsiniz.
            </ScaledText>
          </View>

          {/* İletişim */}
          <View style={styles.contactSection}>
            {/* İletişim Formu Butonu */}
            <TouchableOpacity
              style={styles.contactButton}
              activeOpacity={0.8}
              onPress={navigateToSupportRequest}
            >
              <LinearGradient
                colors={[COLORS.dark.primary, COLORS.dark.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.contactButtonGradient}
              >
                <ScaledText style={styles.contactButtonText}>İletişim Formu</ScaledText>
              </LinearGradient>
            </TouchableOpacity>

            {/* E-posta */}
            <TouchableOpacity
              style={styles.emailContainer}
              activeOpacity={0.7}
              onPress={handleEmailPress}
            >
              <MaterialCommunityIcons name="email-outline" size={22} color={COLORS.dark.primary} />
              <ScaledText style={styles.emailText}>lovla.iletisim@gmail.com</ScaledText>
            </TouchableOpacity>
          </View>

          {/* Alt Butonlar */}
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.footerButton}
              activeOpacity={0.7}
              onPress={navigateToTermsOfService}
            >
              <ScaledText style={styles.footerButtonText}>Kullanım Şartları</ScaledText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerButton}
              activeOpacity={0.7}
              onPress={navigateToPrivacyPolicy}
            >
              <ScaledText style={styles.footerButtonText}>Gizlilik Politikası</ScaledText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: 'bold',
    color: COLORS.dark.text,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.dark.text,
    letterSpacing: 1,
  },
  aboutContainer: {
    marginBottom: SPACING.xxl,
  },
  aboutText: {
    fontSize: TYPOGRAPHY.body1.fontSize,
    lineHeight: 24,
    color: COLORS.dark.text,
    textAlign: 'center',
  },
  contactSection: {
    marginBottom: SPACING.xxl,
  },
  contactButton: {
    width: '100%',
    height: 50,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  contactButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtonText: {
    color: COLORS.dark.text,
    fontSize: TYPOGRAPHY.body1.fontSize,
    fontWeight: 'bold',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  emailText: {
    color: COLORS.dark.primary,
    fontSize: TYPOGRAPHY.body1.fontSize,
    marginLeft: SPACING.sm,
    textDecorationLine: 'underline',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  footerButtonText: {
    color: COLORS.dark.textSecondary,
    fontSize: TYPOGRAPHY.body2.fontSize,
    textDecorationLine: 'underline',
  },
}); 