import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
  Modal,
  Dimensions,
  RefreshControl,
  Platform,
  TouchableWithoutFeedback,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-elements';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../../../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { ScaledText } from '../../../components/common/ScaledText';
import * as Notifications from 'expo-notifications';

// Destek konuları
const SUPPORT_SUBJECTS = [
  'Yüklediğim kredi hesabıma eklenmedi',
  'Premium üyeliğim tanımlanmadı',
  'Uygulamada bir problem yaşıyorum',
  'Hesabımla ilgili bir problem yaşıyorum',
  'Hesabımı silmek istiyorum',
  'Hesabımı dondurmak istiyorum',
  'Diğer Konular'
];

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
  admin_response?: string;
  admin_response_at?: string;
}

export function SupportRequestScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useUser();
  
  // State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  
  // Form değerleri
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  // Bildirimlere izin
  useEffect(() => {
    registerForPushNotifications();
  }, []);
  
  // Kullanıcının ticket'larını getir
  useEffect(() => {
    fetchTickets();
  }, []);
  
  // Bildirim izinleri
  const registerForPushNotifications = async () => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('support-notifications', {
        name: 'Destek Bildirimleri',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Bildirim izni alınamadı!');
      return;
    }
  };
  
  // Ticket'ları getiren fonksiyon
  const fetchTickets = async () => {
    try {
      setLoading(true);
      
      if (!user || !user.id) {
        setTickets([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Destek talepleri alınamadı:', error);
        Alert.alert('Hata', 'Destek talepleriniz alınamadı.');
        return;
      }
      
      setTickets(data || []);
    } catch (error) {
      console.error('Destek talepleri alınamadı:', error);
      Alert.alert('Hata', 'Destek talepleriniz alınamadı.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Yeni ticket gönderen fonksiyon
  const handleSubmit = async () => {
    try {
      // Form kontrolü
      if (!subject) {
        Alert.alert('Hata', 'Lütfen bir konu seçin.');
        return;
      }
      
      if (!message.trim()) {
        Alert.alert('Hata', 'Lütfen talebinizi açıklayın.');
        return;
      }
      
      if (!user || !user.id) {
        Alert.alert('Hata', 'Kullanıcı bilgileriniz bulunamadı.');
        return;
      }
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      setSubmitting(true);
      
      // Tam ad oluştur
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'İsimsiz Kullanıcı';
      
      // Ticket oluştur
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          user_id: user.id,
          full_name: fullName,
          subject,
          message,
          status: 'open'
        })
        .select()
        .single();
        
      if (error) {
        console.error('Destek talebi gönderilemedi:', error);
        Alert.alert('Hata', 'Destek talebiniz gönderilemedi.');
        return;
      }
      
      // Form temizle ve formu kapat
      setSubject('');
      setMessage('');
      setShowNewTicketForm(false);
      
      // Başarı mesajı
      Alert.alert('Başarılı', 'Destek talebiniz başarıyla gönderildi. En kısa sürede sizinle iletişime geçeceğiz.');
      
      // Ticket listesini güncelle
      fetchTickets();
      
    } catch (error) {
      console.error('Destek talebi gönderilemedi:', error);
      Alert.alert('Hata', 'Destek talebiniz gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Liste yenilendiğinde
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };
  
  // Ticket detaylarını göster
  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
  };
  
  // Geri butonu
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Ticket durum renkleri
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return COLORS.dark.warning;
      case 'in_progress':
        return COLORS.dark.secondary;
      case 'closed':
        return COLORS.dark.success;
      default:
        return COLORS.dark.textSecondary;
    }
  };
  
  // Ticket durum metinleri
  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Açık';
      case 'in_progress':
        return 'İşleniyor';
      case 'closed':
        return 'Kapatıldı';
      default:
        return 'Bilinmiyor';
    }
  };
  
  // Tarih formatı
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Renderlama fonksiyonları
  const renderTicketItem = ({ item }: { item: Ticket }) => (
    <TouchableOpacity 
      style={styles.ticketItem} 
      onPress={() => handleViewTicket(item)}
      activeOpacity={0.7}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketHeaderLeft}>
          <MaterialCommunityIcons 
            name="ticket-account" 
            size={20} 
            color={COLORS.dark.text} 
          />
          <ScaledText style={styles.ticketSubject} numberOfLines={1}>
            {item.subject}
          </ScaledText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '30' }]}>
          <ScaledText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </ScaledText>
        </View>
      </View>
      
      <ScaledText style={styles.ticketPreview} numberOfLines={2}>
        {item.message}
      </ScaledText>
      
      <View style={styles.ticketFooter}>
        <ScaledText style={styles.ticketDate}>
          {formatDate(item.created_at)}
        </ScaledText>
        {item.admin_response && (
          <View style={styles.responseIndicator}>
            <MaterialCommunityIcons 
              name="message-reply-text" 
              size={14} 
              color={COLORS.dark.success} 
            />
            <ScaledText style={styles.responseText}>Yanıtlandı</ScaledText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
  
  return (
    <LinearGradient
      colors={['#1A1A1A', '#121212']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 10 : (insets.top > 0 ? 10 : 10) }]}>
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
            <ScaledText style={styles.headerTitle}>Destek Talebi</ScaledText>
            <View style={{ width: 24 }} />
          </View>
        </View>

        <View style={styles.content}>
          {/* Yeni Talep Butonu */}
          <TouchableOpacity 
            style={styles.newTicketButton}
            onPress={() => setShowNewTicketForm(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={COLORS.dark.gradient.primary}
              style={styles.newTicketButtonGradient}
            >
              <MaterialCommunityIcons 
                name="plus" 
                size={20} 
                color="#FFFFFF" 
                style={styles.newTicketButtonIcon} 
              />
              <ScaledText style={styles.newTicketButtonText}>Yeni Destek Talebi Oluştur</ScaledText>
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Ticket Listesi */}
          {loading && tickets.length === 0 ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={COLORS.dark.primary} />
              <ScaledText style={styles.loaderText}>Destek talepleriniz yükleniyor...</ScaledText>
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="ticket-outline" 
                size={64} 
                color={COLORS.dark.textSecondary} 
              />
              <ScaledText style={styles.emptyText}>Henüz bir destek talebiniz bulunmuyor</ScaledText>
              <ScaledText style={styles.emptySubtext}>Bir sorun yaşıyorsanız, "Yeni Destek Talebi Oluştur" butonunu kullanarak bize bildirebilirsiniz.</ScaledText>
            </View>
          ) : (
            <FlatList
              data={tickets}
              renderItem={renderTicketItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.ticketList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={COLORS.dark.primary}
                  colors={[COLORS.dark.primary]}
                />
              }
            />
          )}
        </View>
      </SafeAreaView>
      
      {/* Yeni Ticket Modal */}
      <Modal
        visible={showNewTicketForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewTicketForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ScaledText style={styles.modalTitle}>Yeni Destek Talebi</ScaledText>
              <TouchableOpacity 
                onPress={() => setShowNewTicketForm(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.dark.text} />
              </TouchableOpacity>
            </View>
            
            <TouchableWithoutFeedback onPress={() => {
              if (showSubjectDropdown) {
                setShowSubjectDropdown(false);
              }
            }}>
              <View style={{flex: 1}}>
                <ScrollView 
                  style={styles.modalContent}
                  onScroll={() => {
                    if (showSubjectDropdown) {
                      setShowSubjectDropdown(false);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  {/* Kullanıcı Bilgileri */}
                  <View style={styles.formGroup}>
                    <ScaledText style={styles.formLabel}>Ad Soyad</ScaledText>
                    <View style={styles.disabledInput}>
                      <ScaledText style={styles.disabledInputText}>
                        {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'İsimsiz Kullanıcı'}
                      </ScaledText>
                    </View>
                  </View>
                  
                  <View style={styles.formGroup}>
                    <ScaledText style={styles.formLabel}>Kullanıcı ID</ScaledText>
                    <View style={styles.disabledInput}>
                      <ScaledText style={styles.disabledInputText}>
                        {user?.id || 'ID bulunamadı'}
                      </ScaledText>
                    </View>
                  </View>
                  
                  {/* Konu Seçimi */}
                  <View style={styles.formGroup}>
                    <ScaledText style={styles.formLabel}>Konu</ScaledText>
                    <TouchableOpacity 
                      style={styles.dropdownButton}
                      onPress={() => setShowSubjectDropdown(!showSubjectDropdown)}
                    >
                      <ScaledText style={styles.dropdownButtonText}>
                        {subject || 'Konu seçin'}
                      </ScaledText>
                      <MaterialCommunityIcons 
                        name={showSubjectDropdown ? "chevron-up" : "chevron-down"} 
                        size={24} 
                        color={COLORS.dark.text} 
                      />
                    </TouchableOpacity>
                    
                    {showSubjectDropdown && (
                      <View style={styles.dropdownListContainer}>
                        <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                          {SUPPORT_SUBJECTS.map((item, index) => (
                            <TouchableOpacity
                              key={index}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setSubject(item);
                                setShowSubjectDropdown(false);
                              }}
                            >
                              <ScaledText style={styles.dropdownItemText}>{item}</ScaledText>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  
                  {/* Mesaj */}
                  <View style={styles.formGroup}>
                    <ScaledText style={styles.formLabel}>Talebiniz <Text style={styles.requiredStar}>*</Text></ScaledText>
                    <TextInput
                      style={styles.messageInput}
                      value={message}
                      onChangeText={setMessage}
                      placeholder="Talebinizi detaylı olarak açıklayın..."
                      placeholderTextColor={COLORS.dark.textSecondary}
                      multiline={true}
                      numberOfLines={6}
                      textAlignVertical="top"
                    />
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowNewTicketForm(false)}
                disabled={submitting}
              >
                <ScaledText style={styles.cancelButtonText}>İptal</ScaledText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ScaledText style={styles.submitButtonText}>Talebi Gönder</ScaledText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Ticket Detay Modal */}
      <Modal
        visible={!!selectedTicket}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTicket(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ScaledText style={styles.modalTitle}>Talep Detayı</ScaledText>
              <TouchableOpacity 
                onPress={() => setSelectedTicket(null)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.dark.text} />
              </TouchableOpacity>
            </View>
            
            {selectedTicket && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.ticketDetailHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTicket.status) + '30' }]}>
                    <ScaledText style={[styles.statusText, { color: getStatusColor(selectedTicket.status) }]}>
                      {getStatusText(selectedTicket.status)}
                    </ScaledText>
                  </View>
                  <ScaledText style={styles.ticketDetailDate}>{formatDate(selectedTicket.created_at)}</ScaledText>
                </View>
                
                <ScaledText style={styles.ticketDetailSubject}>{selectedTicket.subject}</ScaledText>
                
                <View style={styles.messageContainer}>
                  <View style={styles.userMessageHeader}>
                    <MaterialCommunityIcons name="account" size={16} color={COLORS.dark.text} />
                    <ScaledText style={styles.userMessageHeaderText}>Talebiniz</ScaledText>
                  </View>
                  <ScaledText style={styles.messageText}>{selectedTicket.message}</ScaledText>
                </View>
                
                {selectedTicket.admin_response && (
                  <View style={styles.adminMessageContainer}>
                    <View style={styles.adminMessageHeader}>
                      <MaterialCommunityIcons name="account-tie" size={16} color={COLORS.dark.primary} />
                      <ScaledText style={styles.adminMessageHeaderText}>Ekip Yanıtı</ScaledText>
                      {selectedTicket.admin_response_at && (
                        <ScaledText style={styles.adminResponseDate}>
                          {formatDate(selectedTicket.admin_response_at)}
                        </ScaledText>
                      )}
                    </View>
                    <ScaledText style={styles.adminMessageText}>{selectedTicket.admin_response}</ScaledText>
                  </View>
                )}
                
                {selectedTicket.status === 'closed' && (
                  <View style={styles.ticketClosedContainer}>
                    <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.dark.success} />
                    <ScaledText style={styles.ticketClosedText}>Bu talep kapatılmıştır</ScaledText>
                  </View>
                )}
              </ScrollView>
            )}
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.closeTicketButton}
                onPress={() => setSelectedTicket(null)}
              >
                <ScaledText style={styles.closeTicketButtonText}>Kapat</ScaledText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
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
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: 20,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  newTicketButton: {
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  newTicketButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
  },
  newTicketButtonIcon: {
    marginRight: SPACING.sm,
  },
  newTicketButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loaderText: {
    marginTop: SPACING.md,
    color: COLORS.dark.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
  },
  ticketList: {
    paddingBottom: SPACING.xl,
  },
  ticketItem: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  ticketHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ticketPreview: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    marginBottom: SPACING.sm,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDate: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
  },
  responseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  responseText: {
    fontSize: 12,
    color: COLORS.dark.success,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1F1F1F',
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    height: '90%',
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  modalContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    flex: 1,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark.text,
    marginBottom: SPACING.xs,
  },
  disabledInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  disabledInputText: {
    color: COLORS.dark.textSecondary,
    fontSize: 16,
  },
  dropdownButton: {
    backgroundColor: '#2A2A2A',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    color: COLORS.dark.text,
    fontSize: 16,
  },
  dropdownListContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#2A2A2A',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: SPACING.xs,
    maxHeight: 250,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownList: {
    width: '100%',
  },
  dropdownItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: '#2A2A2A',
  },
  dropdownItemText: {
    color: COLORS.dark.text,
    fontSize: 16,
  },
  messageInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    color: COLORS.dark.text,
    fontSize: 16,
    minHeight: 120,
  },
  requiredStar: {
    color: COLORS.dark.error,
  },
  modalFooter: {
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  cancelButtonText: {
    color: COLORS.dark.text,
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.dark.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ticketDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  ticketDetailDate: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
  },
  ticketDetailSubject: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.md,
  },
  messageContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  userMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  userMessageHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark.text,
    marginLeft: SPACING.xs,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.dark.text,
    lineHeight: 20,
  },
  adminMessageContainer: {
    backgroundColor: 'rgba(103, 58, 183, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.dark.primary,
  },
  adminMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  adminMessageHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark.primary,
    marginLeft: SPACING.xs,
  },
  adminResponseDate: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
    marginLeft: 'auto',
  },
  adminMessageText: {
    fontSize: 15,
    color: COLORS.dark.text,
    lineHeight: 20,
  },
  ticketClosedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  ticketClosedText: {
    fontSize: 14,
    color: COLORS.dark.success,
    marginLeft: SPACING.xs,
  },
  closeTicketButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    flex: 1,
  },
  closeTicketButtonText: {
    color: COLORS.dark.text,
    fontSize: 16,
    fontWeight: '500',
  },
}); 