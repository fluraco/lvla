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
  Platform,
} from 'react-native';
import { ElementsText } from '../../../components/common/wrappers';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../../../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { IAPService, ProductType } from '../../../services/IAPService';
import * as IAP from 'react-native-iap';
import { IAPDebugComponent } from '../../../components/debug/IAPDebugComponent';

export function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const { user, refetchUserData } = useUser();
  const navigation = useNavigation();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [monthlyPrice, setMonthlyPrice] = useState('Yükleniyor...');
  const [showDebug, setShowDebug] = useState(__DEV__); // Sadece development'da göster
  
  // IAP servisini başlat
  useEffect(() => {
    const initializeIAP = async () => {
      try {
        console.log('Premium Screen: IAP servisi başlatılıyor...');
        const iapService = IAPService.getInstance();
        await iapService.initialize();
        
        // Önce ürünleri yenile
        console.log('Premium Screen: Ürünler yenileniyor...');
        await iapService.refreshProducts();
        
        // Premium abonelik ürünlerini getir
        console.log('Premium Screen: Premium ürünler alınıyor...');
        const subscriptionProducts = iapService.getProductsByType(ProductType.SUBSCRIPTION);
        console.log('Premium Screen: Bulunan premium ürün sayısı:', subscriptionProducts.length);
        
        setProducts(subscriptionProducts);
        
        // Google Play'den premium ürünü direkt almayı dene
        const PREMIUM_PRODUCT_ID = Platform.OS === 'ios' 
          ? 'com.lovlalive.premium.monthly' 
          : 'com.lovlalive.premium.monthly';
          
        console.log('Premium Screen: Direkt ürün ID ile deneniyor:', PREMIUM_PRODUCT_ID);
        try {
          // Doğrudan belirli ürünü almayı dene
          const directProducts = await IAP.getProducts({
            skus: [PREMIUM_PRODUCT_ID]
          });
          
          if (directProducts && directProducts.length > 0) {
            const directProduct = directProducts[0];
            console.log('Premium Screen: Direkt ürün bulundu:', {
              productId: directProduct.productId,
              title: directProduct.title,
              price: directProduct.localizedPrice
            });
            
            if (directProduct.localizedPrice) {
              setMonthlyPrice(directProduct.localizedPrice);
              console.log('Premium Screen: Direkt fiyat ayarlandı:', directProduct.localizedPrice);
              return;
            }
          }
        } catch (directError) {
          console.error('Premium Screen: Direkt ürün alınamadı:', directError);
          // Devam et ve diğer yöntemleri dene
        }
        
        // Premium ürün fiyatını ayarla
        if (subscriptionProducts.length > 0) {
          const premiumProduct = subscriptionProducts[0];
          console.log('Premium Screen: Premium ürün detayları:', {
            productId: premiumProduct.productId,
            title: premiumProduct.title,
            localizedPrice: premiumProduct.localizedPrice,
            price: premiumProduct.price,
            currency: premiumProduct.currency
          });
          
          if (premiumProduct && premiumProduct.localizedPrice) {
            setMonthlyPrice(premiumProduct.localizedPrice);
            console.log('Premium Screen: Fiyat ayarlandı:', premiumProduct.localizedPrice);
          } else {
            console.warn('Premium Screen: Ürün fiyat bilgisi eksik:', premiumProduct);
            
            // Title ve description bilgisinden aylık fiyatı çıkarmayı deneyelim
            if (premiumProduct.title && premiumProduct.title.includes('(')) {
              const priceMatch = premiumProduct.title.match(/\(([^)]+)\)/);
              if (priceMatch && priceMatch[1]) {
                setMonthlyPrice(priceMatch[1]);
                console.log('Premium Screen: Title\'dan fiyat çıkarıldı:', priceMatch[1]);
                return;
              }
            }
            
            // Eğer ürün adından fiyat çıkarılamazsa IAP'den tüm ürünleri alıp kontrol et
            try {
              console.log('Premium Screen: Tüm ürünler tekrar kontrol ediliyor...');
              const allProducts = await IAP.getProducts({
                skus: ['com.lovlalive.premium.monthly']
              });
              
              if (allProducts && allProducts.length > 0) {
                const premiumProd = allProducts.find(p => 
                  p.productId === 'com.lovlalive.premium.monthly' || 
                  p.productId.toLowerCase().includes('premium')
                );
                
                if (premiumProd && premiumProd.localizedPrice) {
                  setMonthlyPrice(premiumProd.localizedPrice);
                  console.log('Premium Screen: Tüm ürünlerden fiyat bulundu:', premiumProd.localizedPrice);
                  return;
                }
              }
            } catch (error) {
              console.error('Premium Screen: Tüm ürünler alınırken hata:', error);
            }
            
            setMonthlyPrice(Platform.OS === 'ios' ? '₺39,99/ay' : '₺39,99/ay');
            console.log('Premium Screen: Varsayılan fiyat ayarlandı: ₺39,99/ay');
          }
        } else {
          console.warn('Premium Screen: Premium ürün bulunamadı');
          
          // Son çare olarak direkt fiyat göster
          setMonthlyPrice(Platform.OS === 'ios' ? '₺39,99/ay' : '₺39,99/ay');
          console.log('Premium Screen: Varsayılan fiyat ayarlandı: ₺39,99/ay');
        }
      } catch (error) {
        console.error('Premium Screen: IAP servisi başlatılırken hata:', error);
        
        // Hata durumunda varsayılan fiyat göster
        setMonthlyPrice(Platform.OS === 'ios' ? '₺39,99/ay' : '₺39,99/ay');
        console.log('Premium Screen: Hata nedeniyle varsayılan fiyat ayarlandı: ₺39,99/ay');
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

  useEffect(() => {
    // Kullanıcının premium durumunu kontrol et
    checkPremiumStatus();
  }, []);

  // Premium durumu kontrolü
  const checkPremiumStatus = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // IAP servisinden premium durumunu kontrol et
      const iapService = IAPService.getInstance();
      const isPremiumUser = await iapService.checkPremiumStatus();
      
      // Veritabanından premium durumunu ve bitiş tarihini al
      const { data, error } = await supabase
        .from('users')
        .select('is_premium, premium_expires_at')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Premium durumu kontrol edilirken hata:', error);
        return;
      }
      
      // Premium durumunu ve bitiş tarihini ayarla
      setIsPremium(data?.is_premium || false);
      setExpiryDate(data?.premium_expires_at);
      
    } catch (error) {
      console.error('Premium durumu kontrol edilirken beklenmeyen hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Premium satın alma işlemi
  const handlePurchasePremium = async () => {
    if (!user?.id) {
      Alert.alert('Hata', 'Satın alma işlemi için giriş yapmanız gerekmektedir.');
      return;
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPurchasing(true);
      
      // IAP servisini kullanarak satın alma işlemini başlat
      const iapService = IAPService.getInstance();
      await iapService.purchasePremiumSubscription(user.id);
      
      // Not: Satın alma işlemi tamamlandığında IAP servisi içindeki listener'lar
      // otomatik olarak veritabanını güncelleyecek ve kullanıcıya bildirim gösterecektir
      
      // Kullanıcı verilerini yenile
      await refetchUserData();
      
      // Premium durumunu kontrol et
      await checkPremiumStatus();
      
    } catch (error) {
      console.error('Premium satın alma sırasında beklenmeyen hata:', error);
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setPurchasing(false);
    }
  };

  // Premium abonelik iptali
  const handleCancelPremium = () => {
    const iapService = IAPService.getInstance();
    iapService.cancelSubscription();
  };

  // Tarih formatla
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Geri gitme fonksiyonu
  const handleGoBack = () => {
    navigation.goBack();
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
          <ElementsText style={styles.headerTitle}>Premium Üyelik</ElementsText>
          <View style={styles.headerRight} />
        </View>
        
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Premium Logo */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#9C27B0', '#673AB7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoBadge}
            >
              <MaterialCommunityIcons name="crown" size={64} color="#FFFFFF" />
            </LinearGradient>
            <ElementsText style={styles.logoTitle}>Lovlalive Premium</ElementsText>
            <ElementsText style={styles.logoSubtitle}>
              En iyi eşleşme deneyimi için Premium Üyelik alın
            </ElementsText>
          </View>

          {/* Premium Durum Kartı */}
          {isPremium ? (
            <View style={styles.premiumStatusCard}>
              <LinearGradient
                colors={['#7B1FA2', '#6A1B9A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.premiumStatusGradient}
              >
                <MaterialCommunityIcons name="check-decagram" size={28} color="#FFFFFF" />
                <View style={styles.premiumStatusTextContainer}>
                  <ElementsText style={styles.premiumStatusTitle}>
                    Premium Üyeliğiniz Aktif
                  </ElementsText>
                  <ElementsText style={styles.premiumStatusDescription}>
                    {expiryDate ? `${formatDate(expiryDate)} tarihine kadar geçerli` : 'Süresiz üyelik'}
                  </ElementsText>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.pricingCard}>
              <LinearGradient
                colors={['#333333', '#252525']}
                style={styles.pricingGradient}
              >
                <View style={styles.pricingHeader}>
                  <ElementsText style={styles.pricingTitle}>Aylık Premium</ElementsText>
                  <ElementsText style={styles.pricingPrice}>{monthlyPrice}<ElementsText style={styles.pricingPeriod}>/ay</ElementsText></ElementsText>
                </View>
                <ElementsText style={styles.pricingDescription}>
                  Her ay otomatik olarak yenilenir. İstediğiniz zaman iptal edebilirsiniz.
                </ElementsText>
              </LinearGradient>
            </View>
          )}

          {/* Özellikler Listesi */}
          <View style={styles.featuresContainer}>
            <ElementsText style={styles.featuresTitle}>Premium Özellikleri</ElementsText>

            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="gesture-swipe-right" size={24} color={COLORS.dark.primary} style={styles.featureIcon} />
              <View style={styles.featureTextContainer}>
                <ElementsText style={styles.featureTitle}>Sınırsız Beğeni</ElementsText>
                <ElementsText style={styles.featureDescription}>
                  Günlük 30 sınırı olmadan sınırsız kullanıcı beğenin
                </ElementsText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="account-search" size={24} color={COLORS.dark.primary} style={styles.featureIcon} />
              <View style={styles.featureTextContainer}>
                <ElementsText style={styles.featureTitle}>Beğenenleri Görüntüleme</ElementsText>
                <ElementsText style={styles.featureDescription}>
                  Sizi beğenen kullanıcıların tam listesine erişin
                </ElementsText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="rocket" size={24} color={COLORS.dark.primary} style={styles.featureIcon} />
              <View style={styles.featureTextContainer}>
                <ElementsText style={styles.featureTitle}>Ücretsiz Boost</ElementsText>
                <ElementsText style={styles.featureDescription}>
                  Premium üyeliğinizle 1 adet ücretsiz boost hakkı kazanın
                </ElementsText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="video" size={24} color={COLORS.dark.primary} style={styles.featureIcon} />
              <View style={styles.featureTextContainer}>
                <ElementsText style={styles.featureTitle}>Görüntülü ve Sesli Görüşme</ElementsText>
                <ElementsText style={styles.featureDescription}>
                  Eşleştiğiniz kişilerle görüntülü ve sesli görüşme yapın
                </ElementsText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="microphone" size={24} color={COLORS.dark.primary} style={styles.featureIcon} />
              <View style={styles.featureTextContainer}>
                <ElementsText style={styles.featureTitle}>Sesli Mesaj</ElementsText>
                <ElementsText style={styles.featureDescription}>
                  Sesli mesaj gönderme özelliğini kullanın
                </ElementsText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="filter-variant" size={24} color={COLORS.dark.primary} style={styles.featureIcon} />
              <View style={styles.featureTextContainer}>
                <ElementsText style={styles.featureTitle}>Gelişmiş Filtreler</ElementsText>
                <ElementsText style={styles.featureDescription}>
                  Yaş ve konum gibi gelişmiş filtreleme seçeneklerini kullanın
                </ElementsText>
              </View>
            </View>
          </View>
          
          {/* Satın Alma / İptal Etme Butonları */}
          <View style={styles.actionButtonsContainer}>
            {isPremium ? (
              <View style={styles.subscriptionInfoContainer}>
                <ElementsText style={styles.subscriptionInfoText}>
                  Aboneliğinizi iptal etmek için aşağıdaki düğmeye basabilirsiniz. Aboneliğiniz süre sonuna kadar devam edecek, ancak otomatik yenileme kapatılacaktır.
                </ElementsText>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelPremium}
                  activeOpacity={0.8}
                >
                  <ElementsText style={styles.cancelButtonText}>Aboneliği İptal Et</ElementsText>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.purchaseButton}
                onPress={handlePurchasePremium}
                disabled={purchasing}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#9C27B0', '#673AB7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.purchaseButtonGradient}
                >
                  {purchasing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="crown" size={20} color="#FFFFFF" style={styles.purchaseButtonIcon} />
                      <ElementsText style={styles.purchaseButtonText}>Premium Ol</ElementsText>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            {/* Mağaza butonu */}
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => navigation.navigate('ConsumablesShopScreen' as never)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="cart" size={20} color={COLORS.dark.primary} style={styles.shopButtonIcon} />
              <ElementsText style={styles.shopButtonText}>Boost ve SuperLike Satın Al</ElementsText>
            </TouchableOpacity>
          </View>
          
          {/* Bilgi Metni */}
          <View style={styles.infoTextContainer}>
            <ElementsText style={styles.infoText}>
              Aboneliğiniz her ay otomatik olarak yenilenir ve istediğiniz zaman iptal edebilirsiniz.
              Ödeme, Apple App Store veya Google Play hesabınız aracılığıyla gerçekleştirilir.
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
          
          {/* Debug komponenti - sadece development modunda */}
          {showDebug && (
            <View>
              <TouchableOpacity
                style={styles.debugToggleButton}
                onPress={() => setShowDebug(!showDebug)}
              >
                <ElementsText style={styles.debugToggleText}>
                  Debug Panel {showDebug ? 'Gizle' : 'Göster'}
                </ElementsText>
              </TouchableOpacity>
              
              <IAPDebugComponent />
            </View>
          )}
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  logoBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark.text,
    marginVertical: SPACING.sm,
  },
  logoSubtitle: {
    fontSize: 16,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  pricingCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
    marginVertical: SPACING.lg,
  },
  pricingGradient: {
    padding: SPACING.lg,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
  },
  pricingPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark.primary,
  },
  pricingPeriod: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.dark.textSecondary,
  },
  pricingDescription: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    marginTop: SPACING.xs,
  },
  premiumStatusCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
    marginVertical: SPACING.lg,
  },
  premiumStatusGradient: {
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumStatusTextContainer: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  premiumStatusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  premiumStatusDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  featuresContainer: {
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.lg,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  featureIcon: {
    marginRight: SPACING.md,
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.xs,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    lineHeight: 20,
  },
  actionButtonsContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  purchaseButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  purchaseButtonIcon: {
    marginRight: SPACING.sm,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.dark.error,
  },
  subscriptionInfoContainer: {
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  subscriptionInfoText: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    fontSize: 14,
    color: COLORS.dark.primary,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: SPACING.md,
  },
  shopButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: SPACING.md,
  },
  shopButtonIcon: {
    marginRight: SPACING.sm,
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.dark.primary,
  },
  debugToggleButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  debugToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.dark.primary,
  },
}); 