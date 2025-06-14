import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { ElementsText } from '../../../components/common/wrappers';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../../../contexts/UserContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { IAPService, ProductType } from '../../../services/IAPService';
import * as IAP from 'react-native-iap';
import { supabase } from '../../../lib/supabase';

interface TabData {
  key: string;
  title: string;
  icon: any;
  productType: ProductType;
  description: string;
  backgroundColor: string[];
  subTabs?: SubTabData[];
}

interface SubTabData {
  key: string;
  title: string;
  description: string;
  icon: any;
}

export function ConsumablesShopScreen() {
  const insets = useSafeAreaInsets();
  const { user, refetchUserData } = useUser();
  const navigation = useNavigation();
  const route = useRoute();
  const initialTab = route.params?.initialTab || 'boost';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSubTab, setActiveSubTab] = useState('message_credit');
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [products, setProducts] = useState<IAP.Product[]>([]);
  
  // Kullanıcı verileri
  const [boostCount, setBoostCount] = useState(0);
  const [superlikeCount, setSuperlikeCount] = useState(0);
  const [messageCreditCount, setMessageCreditCount] = useState(0);
  const [giftCreditCount, setGiftCreditCount] = useState(0);

  const tabs: TabData[] = [
    {
      key: 'boost',
      title: 'Boost',
      icon: 'rocket',
      productType: ProductType.BOOST,
      description: 'Profilinizi öne çıkararak daha fazla kişi tarafından görülmenizi sağlar.',
      backgroundColor: ['#FF9800', '#F57C00']
    },
    {
      key: 'superlike',
      title: 'SuperLike',
      icon: 'star',
      productType: ProductType.SUPERLIKE,
      description: 'Beğendiğiniz kişilere özel olduğunuzu göstererek eşleşme şansınızı artırır.',
      backgroundColor: ['#2196F3', '#1976D2']
    },
    {
      key: 'credit',
      title: 'Kredi',
      icon: 'currency-usd',
      productType: ProductType.CREDIT,
      description: 'Uygulama içi özel özelliklere erişim sağlayabileceğiniz sanal para birimi.',
      backgroundColor: ['#9C27B0', '#7B1FA2'],
      subTabs: [
        {
          key: 'message_credit',
          title: 'Mesaj Kredisi',
          description: 'Eşleştiğiniz kişilerle mesajlaşmak için kullanılır.',
          icon: 'message-text'
        },
        {
          key: 'gift_credit',
          title: 'Hediye Kredisi',
          description: 'Eşleştiğiniz kişilere hediye göndermek için kullanılır.',
          icon: 'gift'
        }
      ]
    }
  ];

  // IAP servisini başlat
  useEffect(() => {
    const initializeIAP = async () => {
      try {
        setLoading(true);
        const iapService = IAPService.getInstance();
        await iapService.initialize();
        
        // Ürünleri getir
        await loadProducts();
        
        // Kullanıcının sahip olduğu öğeleri getir
        await loadUserCredits();
      } catch (error) {
        console.error('IAP servisi başlatılırken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeIAP();
    
    // Temizlik işlemi
    return () => {
      const cleanupIAP = async () => {
        try {
          const iapService = IAPService.getInstance();
          await iapService.finalize();
        } catch (error) {
          console.error('IAP servisi kapatılırken hata:', error);
        }
      };
      
      cleanupIAP();
    };
  }, []);

  // Ürünleri yükle
  const loadProducts = async (tabKey?: string) => {
    try {
      const iapService = IAPService.getInstance();
      
      // Önce ürünleri yenile/yükle
      await iapService.refreshProducts();
      
      // Parametre olarak gelen tabKey'i kullan, yoksa mevcut activeTab'i kullan
      const targetTab = tabKey || activeTab;
      const currentTab = tabs.find(tab => tab.key === targetTab);
      
      if (currentTab) {
        let filteredProducts = iapService.getProductsByType(currentTab.productType);
        
        // Eğer kredi sekmesi aktifse alt sekmeye göre filtrele
        if (targetTab === 'credit' && activeSubTab) {
          filteredProducts = filterProductsForSubTab(filteredProducts, activeSubTab);
        }
        
        setProducts(filteredProducts);
        console.log(`${currentTab.title} için ${filteredProducts.length} ürün yüklendi`);
      }
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    }
  };

  // Alt sekme için ürünleri yükle
  const loadProductsForSubTab = async (subTabKey: string) => {
    try {
      const iapService = IAPService.getInstance();
      const currentTab = tabs.find(tab => tab.key === activeTab);
      
      if (currentTab) {
        let filteredProducts = iapService.getProductsByType(currentTab.productType);
        
        // Alt sekmeye göre filtrele
        filteredProducts = filterProductsForSubTab(filteredProducts, subTabKey);
        
        setProducts(filteredProducts);
        console.log(`${subTabKey} için ${filteredProducts.length} ürün yüklendi`);
      }
    } catch (error) {
      console.error('Alt sekme ürünleri yüklenirken hata:', error);
    }
  };

  // Alt sekmeye göre ürünleri filtrele
  const filterProductsForSubTab = (products: any[], subTabKey: string) => {
    return products.filter(product => {
      const productName = (product.title || product.productId || '').toLowerCase();
      
      switch (subTabKey) {
        case 'message_credit':
          return productName.includes('mesaj') || 
                 productName.includes('message') ||
                 productName.includes('chat') ||
                 productName.includes('msgcredits');
        case 'gift_credit':
          return productName.includes('hediye') || 
                 productName.includes('gift') ||
                 productName.includes('giftcredits') ||
                 (!productName.includes('mesaj') && !productName.includes('message') && !productName.includes('chat') && !productName.includes('msgcredits'));
        default:
          return true;
      }
    });
  };

  // Kullanıcının kredilerini ve diğer öğelerini yükle
  const loadUserCredits = async () => {
    if (!user?.id) return;
    
    try {
      const iapService = IAPService.getInstance();
      const userConsumables = await iapService.getUserConsumables();
      
      setBoostCount(userConsumables.boostCount);
      setSuperlikeCount(userConsumables.superlikeCount);
      setMessageCreditCount(userConsumables.messageCreditCount);
      setGiftCreditCount(userConsumables.giftCreditCount);
      
      console.log('Kullanıcı ürünleri yüklendi:', userConsumables);
    } catch (error) {
      console.error('Kullanıcı kredileri yüklenirken hata:', error);
    }
  };

  // Sekme değişikliği
  const handleTabChange = async (tabKey: string) => {
    console.log(`Sekme değiştiriliyor: ${activeTab} -> ${tabKey}`);
    
    setActiveTab(tabKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Eğer kredi sekmesi seçildiyse, varsayılan olarak mesaj kredisini seç
    if (tabKey === 'credit' && tabs.find(tab => tab.key === 'credit')?.subTabs) {
      setActiveSubTab('message_credit');
    }
    
    // Ürünleri tabKey parametresi ile yeniden yükle (state güncellenmesini beklemeden)
    await loadProducts(tabKey);
  };

  // Alt sekme değişikliği
  const handleSubTabChange = async (subTabKey: string) => {
    setActiveSubTab(subTabKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Alt sekme değişikliğinde ürünleri yeniden filtrele
    await loadProductsForSubTab(subTabKey);
  };

  // Ürün satın alma
  const handlePurchase = async (productId: string) => {
    if (!user?.id) {
      Alert.alert('Hata', 'Satın alma işlemi için giriş yapmanız gerekmektedir.');
      return;
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPurchasing(true);
      
      // IAP servisini kullanarak satın alma işlemini başlat
      const iapService = IAPService.getInstance();
      await iapService.purchaseConsumable(productId, user.id);
      
      // Not: Satın alma işlemi tamamlandığında IAP servisi içindeki listener'lar
      // otomatik olarak veritabanını güncelleyecek ve kullanıcıya bildirim gösterecektir
      
      // Kullanıcı verilerini yenile
      await refetchUserData();
      
      // Kullanıcının sahip olduğu öğeleri yenile
      await loadUserCredits();
      
    } catch (error) {
      console.error('Satın alma sırasında beklenmeyen hata:', error);
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setPurchasing(false);
    }
  };

  // Geri gitme fonksiyonu
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Aktif sekmeye göre sayaç değerini göster
  const getCountForActiveTab = () => {
    switch (activeTab) {
      case 'boost':
        return boostCount;
      case 'superlike':
        return superlikeCount;
      case 'credit':
        // Alt sekmeye göre kredi miktarını göster
        if (activeSubTab === 'message_credit') {
          return messageCreditCount;
        } else if (activeSubTab === 'gift_credit') {
          return giftCreditCount;
        }
        return 0;
      default:
        return 0;
    }
  };

  // Aktif sekme bilgisini al
  const getActiveTabData = (): TabData => {
    return tabs.find(tab => tab.key === activeTab) || tabs[0];
  };

  // Aktif alt sekme bilgisini al
  const getActiveSubTabData = (): SubTabData | undefined => {
    const currentTab = getActiveTabData();
    if (currentTab.subTabs) {
      return currentTab.subTabs.find(subTab => subTab.key === activeSubTab);
    }
    return undefined;
  };

  // Seçili sekme için açıklama metnini al
  const getDescriptionText = (): string => {
    const currentTab = getActiveTabData();
    const currentSubTab = getActiveSubTabData();
    
    if (currentTab.key === 'credit' && currentSubTab) {
      return currentSubTab.description;
    }
    
    return currentTab.description;
  };

  // Seçili sekme için başlık metnini al
  const getTitleText = (): string => {
    const currentTab = getActiveTabData();
    const currentSubTab = getActiveSubTabData();
    
    if (currentTab.key === 'credit' && currentSubTab) {
      return currentSubTab.title;
    }
    
    return currentTab.title;
  };

  // Seçili sekme için ikon al
  const getTitleIcon = (): string => {
    const currentTab = getActiveTabData();
    const currentSubTab = getActiveSubTabData();
    
    if (currentTab.key === 'credit' && currentSubTab) {
      return currentSubTab.icon;
    }
    
    return currentTab.icon;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.dark.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#1A1A1A', '#121212']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 10 }]}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.dark.text} />
          </TouchableOpacity>
          <ElementsText style={styles.headerTitle}>Mağaza</ElementsText>
          <View style={styles.headerRight} />
        </View>
        
        {/* Ana Sekmeler */}
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && styles.activeTabButton
              ]}
              onPress={() => handleTabChange(tab.key)}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={20}
                color={activeTab === tab.key ? COLORS.dark.primary : COLORS.dark.textSecondary}
                style={styles.tabIcon}
              />
              <ElementsText
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText
                ]}
              >
                {tab.title}
              </ElementsText>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Alt Sekmeler (Kredi kategorisi için) */}
        {activeTab === 'credit' && (
          <View style={styles.subTabContainer}>
            {getActiveTabData().subTabs?.map((subTab) => (
              <TouchableOpacity
                key={subTab.key}
                style={[
                  styles.subTabButton,
                  activeSubTab === subTab.key && styles.activeSubTabButton
                ]}
                onPress={() => handleSubTabChange(subTab.key)}
              >
                <MaterialCommunityIcons
                  name={subTab.icon}
                  size={18}
                  color={activeSubTab === subTab.key ? COLORS.dark.primary : COLORS.dark.textSecondary}
                  style={styles.subTabIcon}
                />
                <ElementsText
                  style={[
                    styles.subTabText,
                    activeSubTab === subTab.key && styles.activeSubTabText
                  ]}
                >
                  {subTab.title}
                </ElementsText>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Başlık ve Açıklama */}
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons
                name={getTitleIcon()}
                size={32}
                color={COLORS.dark.primary}
                style={styles.titleIcon}
              />
              <ElementsText style={styles.titleText}>
                {getTitleText()}
              </ElementsText>
              
              <View style={styles.counterContainer}>
                <ElementsText style={styles.counterText}>
                  {getCountForActiveTab()}
                </ElementsText>
              </View>
            </View>
            
            <ElementsText style={styles.descriptionText}>
              {getDescriptionText()}
            </ElementsText>
          </View>
          
          {/* Ürün Listesi */}
          <View style={styles.productsContainer}>
            {products.length === 0 ? (
              <View style={styles.noProductsContainer}>
                <MaterialCommunityIcons name="package-variant-closed" size={48} color={COLORS.dark.textSecondary} />
                <ElementsText style={styles.noProductsText}>
                  Ürün bulunamadı
                </ElementsText>
              </View>
            ) : (
              products.map((product) => (
                <TouchableOpacity
                  key={product.productId}
                  style={styles.productCard}
                  onPress={() => handlePurchase(product.productId)}
                  disabled={purchasing}
                >
                  <LinearGradient
                    colors={getActiveTabData().backgroundColor}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.productGradient}
                  >
                    <View style={styles.productInfo}>
                      <ElementsText style={styles.productTitle}>
                        {product.title || product.productId.split('.').pop()}
                      </ElementsText>
                      <ElementsText style={styles.productPrice}>
                        {product.localizedPrice}
                      </ElementsText>
                    </View>
                    
                    <View style={styles.purchaseButtonContainer}>
                      {purchasing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <MaterialCommunityIcons name="cart" size={24} color="#FFFFFF" />
                      )}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))
            )}
          </View>
          
          {/* Bilgi Metni */}
          <View style={styles.infoTextContainer}>
            <ElementsText style={styles.infoText}>
              Tüm satın alımlar, Apple App Store veya Google Play hesabınız aracılığıyla gerçekleştirilir.
              Satın alınan ürünler geri iade edilemez.
            </ElementsText>
            <TouchableOpacity onPress={() => {
              Alert.alert(
                'Seçim Yapın',
                'Hangi sayfayı görüntülemek istersiniz?',
                [
                  {
                    text: 'Gizlilik Politikası',
                    onPress: () => navigation.navigate('PrivacyPolicy' as never)
                  },
                  {
                    text: 'Kullanım Şartları',
                    onPress: () => navigation.navigate('TermsOfService' as never)
                  }
                ]
              );
            }}>
              <ElementsText style={styles.termsText}>
                Kullanım Koşulları ve Gizlilik Politikası
              </ElementsText>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: 'rgba(26,26,26,0.98)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: 600,
    color: COLORS.dark.text,
    textAlign: 'center',
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.circular,
  },
  headerRight: {
    width: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(26,26,26,0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  activeTabButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabIcon: {
    marginRight: SPACING.xs,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark.textSecondary,
  },
  activeTabText: {
    color: COLORS.dark.primary,
    fontWeight: '600',
  },
  subTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(26,26,26,0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  subTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  activeSubTabButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  subTabIcon: {
    marginRight: SPACING.xs,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.dark.textSecondary,
  },
  activeSubTabText: {
    color: COLORS.dark.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  titleContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  titleIcon: {
    marginRight: SPACING.sm,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark.text,
    flex: 1,
  },
  counterContainer: {
    backgroundColor: COLORS.dark.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    lineHeight: 20,
  },
  productsContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  noProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  noProductsText: {
    fontSize: 16,
    color: COLORS.dark.textSecondary,
    marginTop: SPACING.md,
  },
  productCard: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  productGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  purchaseButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.dark.primary,
    textDecorationLine: 'underline',
  },
}); 