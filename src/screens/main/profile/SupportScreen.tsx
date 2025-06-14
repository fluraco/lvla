import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ElementsText } from '../../../components/common/wrappers';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import * as Haptics from 'expo-haptics';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';

export function SupportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useUser();
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Destek talebi gönderme
  const handleSubmitRequest = async () => {
    // Form validasyonu
    if (!subject.trim()) {
      Alert.alert('Uyarı', 'Lütfen konu başlığını girin');
      return;
    }
    
    if (!message.trim()) {
      Alert.alert('Uyarı', 'Lütfen mesajınızı girin');
      return;
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsSending(true);
      
      // Destek talebini veritabanına kaydet
      const { error } = await supabase
        .from('support_requests')
        .insert({
          user_id: user?.id,
          subject: subject.trim(),
          message: message.trim(),
          status: 'pending'
        });
        
      if (error) {
        console.error('Destek talebi kaydedilemedi:', error);
        Alert.alert('Hata', 'Destek talebiniz gönderilirken bir hata oluştu');
        return;
      }
      
      Alert.alert(
        'Başarılı', 
        'Destek talebiniz alındı. En kısa sürede size dönüş yapılacaktır.',
        [{ text: 'Tamam', onPress: handleGoBack }]
      );
      
    } catch (error) {
      console.error('Destek talebi gönderilirken hata oluştu:', error);
      Alert.alert('Hata', 'Destek talebiniz gönderilirken bir hata oluştu');
    } finally {
      setIsSending(false);
    }
  };
  
  // Geri dön
  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
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
              <ElementsText style={styles.headerTitle}>Destek Talebi</ElementsText>
              <View style={{ width: 24 }} />
            </View>
          </View>
          
          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formContainer}>
              <ElementsText style={styles.formTitle}>
                Nasıl yardımcı olabiliriz?
              </ElementsText>
              <ElementsText style={styles.formDescription}>
                Sorununuzu veya önerinizi detaylı bir şekilde anlatın, size en kısa sürede dönüş yapacağız.
              </ElementsText>
              
              {/* Konu Başlığı */}
              <View style={styles.inputGroup}>
                <ElementsText style={styles.inputLabel}>Konu Başlığı</ElementsText>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Örn: Ödeme sorunu, Hesap problemi"
                  placeholderTextColor={COLORS.dark.textSecondary}
                  selectionColor={COLORS.dark.primary}
                />
              </View>
              
              {/* Mesaj */}
              <View style={styles.inputGroup}>
                <ElementsText style={styles.inputLabel}>Mesajınız</ElementsText>
                <TextInput
                  style={styles.messageInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Sorun veya önerinizin detaylarını yazın..."
                  placeholderTextColor={COLORS.dark.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  selectionColor={COLORS.dark.primary}
                />
              </View>
              
              {/* Gönder Butonu */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitRequest}
                disabled={isSending}
              >
                <LinearGradient
                  colors={['#9C27B0', '#673AB7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons 
                        name="send" 
                        size={20} 
                        color="#FFFFFF" 
                        style={styles.submitButtonIcon} 
                      />
                      <ElementsText style={styles.submitButtonText}>Talebi Gönder</ElementsText>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(26,26,26,0.98)',
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.dark.text,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: SPACING.lg,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark.text,
    marginBottom: SPACING.sm,
  },
  formDescription: {
    fontSize: 16,
    color: COLORS.dark.textSecondary,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.dark.text,
    fontSize: 16,
  },
  messageInput: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.dark.text,
    fontSize: 16,
    height: 150,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.xxl,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  submitButtonIcon: {
    marginRight: SPACING.sm,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 