import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  SectionList,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { ElementsText } from '../../../components/common/wrappers';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';

// Ürün tipi
interface CreditPackage {
  id: string;
  package_name: string;
  description: string;
  credit_amount: number;
  price: number;
  currency: string;
  credit_type: 'message' | 'gift'; // Kredi türü
}

interface CreditHistory {
  id: string;
  transaction_date: string;
  credit_amount: number;
  transaction_type: 'purchase' | 'system' | 'usage';
  description: string;
  credit_type: 'message' | 'gift';
}

type TabType = 'message' | 'gift';

// Route parametrelerini tanımla
type CreditScreenRouteProp = RouteProp<
  {
    CreditScreen: {
      activeTab?: TabType;
    };
  },
  'CreditScreen'
>;

export function CreditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { user, refetchUserData } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>(route.params?.activeTab || 'message');
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [messagePackages, setMessagePackages] = useState<CreditPackage[]>([]);
  const [giftPackages, setGiftPackages] = useState<CreditPackage[]>([]);
  const [messageCredits, setMessageCredits] = useState(0);
  const [giftCredits, setGiftCredits] = useState(0);
  const [creditHistory, setCreditHistory] = useState<CreditHistory[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Veri yükleme işlemi
  const loadData = async () => {
    try {
      await Promise.all([
        loadCreditPackages(),
        loadUserCredits(),
        loadCreditHistory(),
      ]);
    } catch (error) {
      console.error('Kredi verileri yüklenirken hata oluştu:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
    }
  };

  // Kredi paketlerini yükle
  const loadCreditPackages = async () => {
    setLoadingPackages(true);
    try {
      // Mesaj kredisi paketlerini getir
      const { data: messageData, error: messageError } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .eq('credit_type', 'message')
        .order('credit_amount', { ascending: true });

      if (messageError) {
        console.error('Mesaj kredisi paketleri yüklenirken hata:', messageError);
      } else {
        setMessagePackages(messageData || []);
      }

      // Hediye kredisi paketlerini getir
      const { data: giftData, error: giftError } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .eq('credit_type', 'gift')
        .order('credit_amount', { ascending: true });

      if (giftError) {
        console.error('Hediye kredisi paketleri yüklenirken hata:', giftError);
      } else {
        setGiftPackages(giftData || []);
      }
    } catch (error) {
      console.error('Kredi paketleri yüklenirken beklenmeyen hata:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Kullanıcının kredilerini yükle
  const loadUserCredits = async () => {
    if (!user?.id) return;

    try {
      // Mesaj kredilerini getir
      const { data: messageData, error: messageError } = await supabase
        .from('user_message_credits')
        .select('credit_amount')
        .eq('user_id', user.id)
        .single();

      if (messageError && messageError.code !== 'PGRST116') {
        console.error('Mesaj kredileri yüklenirken hata:', messageError);
      } else {
        setMessageCredits(messageData?.credit_amount || 0);
      }

      // Hediye kredilerini getir
      const { data: giftData, error: giftError } = await supabase
        .from('user_credits')
        .select('credit_amount')
        .eq('user_id', user.id)
        .single();

      if (giftError && giftError.code !== 'PGRST116') {
        console.error('Hediye kredileri yüklenirken hata:', giftError);
      } else {
        setGiftCredits(giftData?.credit_amount || 0);
      }
    } catch (error) {
      console.error('Kullanıcı kredileri yüklenirken beklenmeyen hata:', error);
    }
  };

  // Kredi işlem geçmişini yükle
  const loadCreditHistory = async () => {
    if (!user?.id) return;

    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Kredi işlem geçmişi yüklenirken hata:', error);
      } else {
        setCreditHistory(data || []);
      }
    } catch (error) {
      console.error('Kredi işlem geçmişi yüklenirken beklenmeyen hata:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Kredi satın alma işlemi
  const handlePurchase = async (creditPackage: CreditPackage) => {
    if (!user?.id) {
      Alert.alert('Hata', 'Satın alma işlemi için giriş yapmanız gerekmektedir.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPurchasing(true);

      // Backend'e satın alma isteği gönder
      const { data, error } = await supabase
        .rpc('purchase_credit', {
          p_user_id: user.id,
          p_package_id: creditPackage.id,
          p_payment_method: 'credit_card'
        });

      if (error) {
        console.error('Kredi satın alırken hata:', error);
        Alert.alert('Hata', 'Satın alma işlemi sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
        return;
      }

      if (data && data.success) {
        Alert.alert('Başarılı', data.message || `${creditPackage.credit_amount} adet ${creditPackage.credit_type === 'message' ? 'mesaj' : 'hediye'} kredisi satın aldınız.`);
        // Verileri yenile
        refetchUserData();
        loadUserCredits();
        loadCreditHistory();
      } else {
        Alert.alert('Hata', data?.message || 'Satın alma işlemi başarısız oldu.');
      }
    } catch (error) {
      console.error('Kredi satın alırken beklenmeyen hata:', error);
      Alert.alert('Hata', 'Satın alma işlemi sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setPurchasing(false);
    }
  };

  // Para birimini formatla
  const formatCurrency = (price: number, currency: string) => {
    return `${price.toFixed(2)} ${currency}`;
  };

  // Tarih formatla
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Satın alma onay alertini göster
  const showPurchaseConfirmation = (creditPackage: CreditPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Satın Alma Onayı',
      `${creditPackage.package_name} (${formatCurrency(creditPackage.price, creditPackage.currency)}) satın almak istediğinize emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Satın Al',
          onPress: () => handlePurchase(creditPackage),
        },
      ],
    );
  };

  const sections = [
    {
      title: 'bilgi',
      data: ['info']
    },
    {
      title: activeTab === 'message' ? 'Mesaj Kredisi Paketleri' : 'Hediye Kredisi Paketleri',
      data: ['packages']
    },
    {
      title: 'Kredi İşlem Geçmişi',
      data: ['history']
    }
  ];

  const renderItem = ({ item, section }) => {
    if (section.title === 'bilgi') {
      return (
        <View style={styles.infoCard}>
          <LinearGradient
            colors={['#2D2D2D', '#252525']}
            style={styles.infoCardGradient}
          >
            <MaterialCommunityIcons 
              name="information" 
              size={20} 
              color={COLORS.dark.textSecondary} 
            />
            <ElementsText style={styles.infoText}>
              {activeTab === 'message' 
                ? 'Her kullanıcı günlük 5 mesaj kredisi otomatik olarak alır. Her mesaj, 1 kredi harcar.' 
                : 'Hediye kredileri sadece hediye göndermek için kullanılabilir. Her hediyenin farklı kredi değeri vardır.'}
            </ElementsText>
          </LinearGradient>
        </View>
      );
    } else if (section.title.includes('Kredisi Paketleri')) {
      return renderCreditPackages();
    } else if (section.title === 'Kredi İşlem Geçmişi') {
      return renderCreditHistoryContent();
    }
    return null;
  };

  const renderSectionHeader = ({ section }) => {
    if (section.title === 'bilgi') {
      return null;
    }
    return (
      <ElementsText style={styles.sectionTitle}>
        {section.title}
      </ElementsText>
    );
  };

  const renderCreditHistoryContent = () => {
    if (loadingHistory) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.dark.primary} />
        </View>
      );
    }

    if (creditHistory.length === 0) {
      return (
        <View style={styles.emptyHistoryContainer}>
          <MaterialCommunityIcons name="history" size={48} color={COLORS.dark.textSecondary} />
          <ElementsText style={styles.emptyHistoryText}>
            Henüz kredi işleminiz bulunmuyor.
          </ElementsText>
        </View>
      );
    }

    return (
      <View style={styles.historyContainer}>
        {creditHistory.map((item) => (
          <View key={item.id} style={styles.historyItem}>
            <View style={styles.historyItemHeader}>
              <View style={styles.historyItemLeft}>
                <MaterialCommunityIcons 
                  name={
                    item.transaction_type === 'purchase' 
                      ? 'credit-card-plus' 
                      : item.transaction_type === 'system' 
                        ? 'gift' 
                        : 'credit-card-minus'
                  } 
                  size={20} 
                  color={
                    item.transaction_type === 'purchase' || item.transaction_type === 'system'
                      ? '#4CAF50'
                      : '#F44336'
                  } 
                />
                <ElementsText style={styles.historyItemType}>
                  {item.transaction_type === 'purchase' 
                    ? 'Satın Alma' 
                    : item.transaction_type === 'system' 
                      ? 'Sistem' 
                      : 'Kullanım'}
                </ElementsText>
              </View>
              <ElementsText 
                style={[
                  styles.historyItemAmount, 
                  {
                    color: 
                      item.transaction_type === 'purchase' || item.transaction_type === 'system'
                        ? '#4CAF50'
                        : '#F44336'
                  }
                ]}
              >
                {(item.transaction_type === 'purchase' || item.transaction_type === 'system') ? '+' : '-'}
                {item.credit_amount} {item.credit_type === 'message' ? 'Mesaj' : 'Hediye'} Kredisi
              </ElementsText>
            </View>
            <ElementsText style={styles.historyItemDate}>{formatDate(item.transaction_date)}</ElementsText>
            {item.description && (
              <ElementsText style={styles.historyItemDescription}>{item.description}</ElementsText>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderCreditPackages = () => {
    const packages = activeTab === 'message' ? messagePackages : giftPackages;

    if (loadingPackages) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.dark.primary} />
        </View>
      );
    }

    if (packages.length === 0) {
      return (
        <View style={styles.emptyProductsContainer}>
          <MaterialCommunityIcons name="package-variant" size={48} color={COLORS.dark.textSecondary} />
          <ElementsText style={styles.emptyProductsText}>
            Şu anda satın alabileceğiniz {activeTab === 'message' ? 'mesaj' : 'hediye'} kredisi bulunmuyor.
          </ElementsText>
        </View>
      );
    }

    return (
      <View style={styles.productsContainer}>
        {packages.map((creditPackage) => (
          <TouchableOpacity
            key={creditPackage.id}
            style={styles.productCard}
            onPress={() => showPurchaseConfirmation(creditPackage)}
            disabled={purchasing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                activeTab === 'message' 
                  ? ['#4E54C8', '#8F94FB']
                  : ['#FF8008', '#FFC837']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.productCardGradient}
            >
              <View style={styles.productCardHeader}>
                <MaterialCommunityIcons 
                  name={activeTab === 'message' ? 'message-text' : 'gift'} 
                  size={24} 
                  color="#FFFFFF" 
                />
                <ElementsText style={styles.productTitle}>{creditPackage.package_name}</ElementsText>
              </View>
              
              <View style={styles.productDetails}>
                <ElementsText style={styles.productQuantity}>{creditPackage.credit_amount}</ElementsText>
                <ElementsText style={styles.productQuantityLabel}>
                  {activeTab === 'message' ? 'Mesaj' : 'Hediye'} Kredisi
                </ElementsText>
              </View>
              
              <ElementsText style={styles.productDescription}>{creditPackage.description}</ElementsText>
              
              <View style={styles.productFooter}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                  style={styles.productPriceTag}
                >
                  <ElementsText style={styles.productPrice}>
                    {formatCurrency(creditPackage.price, creditPackage.currency)}
                  </ElementsText>
                </LinearGradient>
                
                <View style={styles.buyButtonContainer}>
                  <ElementsText style={styles.buyButtonText}>Satın Al</ElementsText>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#121212']}
        style={styles.gradient}
      >
        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.dark.text} />
          </TouchableOpacity>
          <ElementsText style={styles.headerTitle}>Kredi Satın Al</ElementsText>
          <View style={styles.headerRight} />
        </View>
        
        {/* Kredi Durumu */}
        <View style={styles.creditsStatusContainer}>
          <View style={styles.creditStatusCard}>
            <LinearGradient
              colors={['#4E54C8', '#8F94FB']}
              style={styles.creditStatusGradient}
            >
              <MaterialCommunityIcons name="message-text" size={24} color="#FFFFFF" />
              <ElementsText style={styles.creditStatusValue}>{messageCredits}</ElementsText>
              <ElementsText style={styles.creditStatusLabel}>Mesaj Kredisi</ElementsText>
            </LinearGradient>
          </View>
          
          <View style={styles.creditStatusCard}>
            <LinearGradient
              colors={['#FF8008', '#FFC837']}
              style={styles.creditStatusGradient}
            >
              <MaterialCommunityIcons name="gift" size={24} color="#FFFFFF" />
              <ElementsText style={styles.creditStatusValue}>{giftCredits}</ElementsText>
              <ElementsText style={styles.creditStatusLabel}>Hediye Kredisi</ElementsText>
            </LinearGradient>
          </View>
        </View>
        
        {/* Tab Seçimi */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'message' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('message')}
          >
            <LinearGradient
              colors={
                activeTab === 'message' 
                  ? ['#4E54C8', '#8F94FB'] 
                  : ['#2D2D2D', '#252525']
              }
              style={styles.tabGradient}
            >
              <MaterialCommunityIcons 
                name="message-text" 
                size={20} 
                color={activeTab === 'message' ? "#FFFFFF" : COLORS.dark.textSecondary} 
              />
              <ElementsText 
                style={[
                  styles.tabText,
                  activeTab === 'message' && styles.activeTabText
                ]}
              >
                Mesaj Kredisi
              </ElementsText>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'gift' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('gift')}
          >
            <LinearGradient
              colors={
                activeTab === 'gift' 
                  ? ['#FF8008', '#FFC837'] 
                  : ['#2D2D2D', '#252525']
              }
              style={styles.tabGradient}
            >
              <MaterialCommunityIcons 
                name="gift" 
                size={20} 
                color={activeTab === 'gift' ? "#FFFFFF" : COLORS.dark.textSecondary} 
              />
              <ElementsText 
                style={[
                  styles.tabText,
                  activeTab === 'gift' && styles.activeTabText
                ]}
              >
                Hediye Kredisi
              </ElementsText>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(26,26,26,0.98)',
    zIndex: 10,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: TYPOGRAPHY.h3.fontWeight,
    color: COLORS.dark.text,
  },
  headerRight: {
    width: 40,
  },
  creditsStatusContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  creditStatusCard: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  creditStatusGradient: {
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  creditStatusValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: SPACING.xs,
  },
  creditStatusLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  activeTabButton: {
    ...SHADOWS.small,
  },
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  tabText: {
    marginLeft: SPACING.xs,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl + 40,
  },
  infoCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  infoCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  infoText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    color: COLORS.dark.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.md,
  },
  productsContainer: {
    marginBottom: SPACING.xl,
  },
  productCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  productCardGradient: {
    padding: SPACING.md,
  },
  productCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  productTitle: {
    marginLeft: SPACING.sm,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  productDetails: {
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  productQuantity: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  productQuantityLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  productDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: SPACING.md,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPriceTag: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buyButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: SPACING.xs,
  },
  historyContainer: {
    marginBottom: SPACING.xl,
  },
  historyItem: {
    backgroundColor: 'rgba(45, 45, 45, 0.6)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyItemType: {
    marginLeft: SPACING.xs,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark.text,
  },
  historyItemAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyItemDate: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
    marginBottom: SPACING.xs,
  },
  historyItemDescription: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
  },
  loadingContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyHistoryText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
  },
  emptyProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyProductsText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
  },
}); 