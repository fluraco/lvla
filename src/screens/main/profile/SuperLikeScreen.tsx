import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { ElementsText } from '../../../components/common/wrappers';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { COLORS } from '../../../theme';

// Ürün tipi
interface SuperLikeProduct {
  id: string;
  name: string;
  description: string;
  quantity: number;
  price: number;
  currency: string;
}

export function SuperLikeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, refetchUserData } = useUser();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [products, setProducts] = useState<SuperLikeProduct[]>([]);
  const [superLikes, setSuperLikes] = useState(0);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Veri yükleme işlemi
  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProducts(),
        loadUserSuperLikes(),
        loadPurchaseHistory(),
      ]);
    } catch (error) {
      console.error('SuperLike verileri yüklenirken hata oluştu:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // SuperLike ürünlerini yükle
  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('superlike_products')
      .select('*')
      .eq('is_active', true)
      .order('quantity', { ascending: true });

    if (error) {
      console.error('SuperLike ürünleri yüklenirken hata:', error);
      return;
    }

    setProducts(data || []);
  };

  // Kullanıcının SuperLike haklarını yükle
  const loadUserSuperLikes = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .rpc('get_user_superlikes', { p_user_id: user.id });

    if (error) {
      console.error('SuperLike hakları yüklenirken hata:', error);
      return;
    }

    setSuperLikes(data || 0);
  };

  // Satın alma geçmişini yükle
  const loadPurchaseHistory = async () => {
    if (!user?.id) return;

    try {
      // İlk yöntem hata verirse, alternatif fonksiyonu deneyelim
      const { data, error } = await supabase
        .rpc('get_superlike_purchase_history_alt', { p_user_id: user.id });

      if (error) {
        console.error('Satın alma geçmişi yüklenirken hata:', error);
        
        // Eğer alternatif fonksiyon bulunamazsa, normal history fonksiyonunu deneyelim
        const { data: fallbackData, error: fallbackError } = await supabase
          .rpc('get_superlike_purchase_history', { p_user_id: user.id });
          
        if (fallbackError) {
          console.error('Alternatif satın alma geçmişi de yüklenemedi:', fallbackError);
          return;
        }
        
        setPurchaseHistory(fallbackData || []);
        return;
      }

      setPurchaseHistory(data || []);
    } catch (error) {
      console.error('Satın alma geçmişi yüklenirken beklenmeyen hata:', error);
    }
  };

  // SuperLike satın alma işlemi
  const handlePurchase = async (productId: string) => {
    if (!user?.id) {
      Alert.alert('Hata', 'Satın alma işlemi için giriş yapmanız gerekmektedir.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPurchasing(true);

      const { data, error } = await supabase
        .rpc('purchase_superlike', {
          p_user_id: user.id,
          p_product_id: productId,
          p_payment_method: 'credit_card'
        });

      if (error) {
        console.error('SuperLike satın alırken hata:', error);
        Alert.alert('Hata', 'Satın alma işlemi sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
        return;
      }

      if (data && data.success) {
        Alert.alert('Başarılı', data.message);
        // Verileri yenile
        refetchUserData();
        loadUserSuperLikes();
        loadPurchaseHistory();
      } else {
        Alert.alert('Hata', data?.message || 'Satın alma işlemi başarısız oldu.');
      }
    } catch (error) {
      console.error('SuperLike satın alırken beklenmeyen hata:', error);
      Alert.alert('Hata', 'Satın alma işlemi sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setPurchasing(false);
    }
  };

  // Geri düğmesi
  const handleGoBack = () => {
    navigation.goBack();
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
  const showPurchaseConfirmation = (product: SuperLikeProduct) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Satın Alma Onayı',
      `${product.name} (${formatCurrency(product.price, product.currency)}) satın almak istediğinize emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Satın Al',
          onPress: () => handlePurchase(product.id),
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.dark.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#121212']}
        style={styles.gradient}
      >
        <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top : 10 }]}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.dark.text} />
          </TouchableOpacity>
          <ElementsText style={styles.headerTitle}>SuperLike</ElementsText>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Mevcut SuperLike sayısı */}
          <View style={styles.infoCard}>
            <LinearGradient
              colors={['#2D2D2D', '#252525']}
              style={styles.infoCardGradient}
            >
              <MaterialCommunityIcons name="star" size={28} color="#FFD700" />
              <View style={styles.infoTextContainer}>
                <ElementsText style={styles.infoTitle}>Mevcut SuperLike Hakkınız</ElementsText>
                <ElementsText style={styles.infoValue}>{superLikes}</ElementsText>
              </View>
            </LinearGradient>
          </View>

          {/* SuperLike Planları */}
          <ElementsText style={styles.sectionTitle}>SuperLike Paketleri</ElementsText>
          
          {products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => showPurchaseConfirmation(product)}
              disabled={purchasing}
            >
              <LinearGradient
                colors={['#2D2D2D', '#252525']}
                style={styles.productCardGradient}
              >
                <View style={styles.productInfo}>
                  <ElementsText style={styles.productName}>{product.name}</ElementsText>
                  {product.description && (
                    <ElementsText style={styles.productDescription}>{product.description}</ElementsText>
                  )}
                </View>
                <View style={styles.productPriceContainer}>
                  <ElementsText style={styles.productPrice}>
                    {formatCurrency(product.price, product.currency)}
                  </ElementsText>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}

          {/* Satın Alma Geçmişi */}
          {purchaseHistory.length > 0 && (
            <>
              <ElementsText style={styles.sectionTitle}>Satın Alma Geçmişi</ElementsText>
              
              {purchaseHistory.map((purchase) => (
                <View key={purchase.id} style={styles.historyCard}>
                  <LinearGradient
                    colors={['#2D2D2D', '#252525']}
                    style={styles.historyCardGradient}
                  >
                    <View style={styles.historyInfo}>
                      <ElementsText style={styles.historyProduct}>
                        {purchase.product ? purchase.product.name : purchase.product_name || 'SuperLike Paketi'}
                      </ElementsText>
                      <ElementsText style={styles.historyDate}>
                        {formatDate(purchase.created_at)}
                      </ElementsText>
                    </View>
                    <View style={styles.historyPriceContainer}>
                      <ElementsText style={styles.historyPrice}>
                        {formatCurrency(purchase.total_price, purchase.currency)}
                      </ElementsText>
                    </View>
                  </LinearGradient>
                </View>
              ))}
            </>
          )}

          {/* SuperLike Nasıl Kullanılır */}
          <ElementsText style={styles.sectionTitle}>SuperLike Nasıl Kullanılır?</ElementsText>
          <View style={styles.howToCard}>
            <LinearGradient
              colors={['#2D2D2D', '#252525']}
              style={styles.howToCardGradient}
            >
              <View style={styles.howToItem}>
                <MaterialCommunityIcons name="numeric-1-circle-outline" size={24} color={COLORS.dark.primary} />
                <ElementsText style={styles.howToText}>
                  Ana sayfada beğendiğiniz profili görüntülerken SuperLike butonuna tıklayın.
                </ElementsText>
              </View>
              <View style={styles.howToItem}>
                <MaterialCommunityIcons name="numeric-2-circle-outline" size={24} color={COLORS.dark.primary} />
                <ElementsText style={styles.howToText}>
                  SuperLike gönderdiğiniz profilin size öncelikli olarak gösterilme şansı artar.
                </ElementsText>
              </View>
              <View style={styles.howToItem}>
                <MaterialCommunityIcons name="numeric-3-circle-outline" size={24} color={COLORS.dark.primary} />
                <ElementsText style={styles.howToText}>
                  Eşleşme olasılığınızı artırmak için SuperLike kullanın!
                </ElementsText>
              </View>
            </LinearGradient>
          </View>
        </ScrollView>
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
    paddingHorizontal: 16,
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  infoCard: {
    marginVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  infoTextContainer: {
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginTop: 24,
    marginBottom: 12,
  },
  productCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  productCardGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark.text,
  },
  productDescription: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    marginTop: 4,
  },
  productPriceContainer: {
    backgroundColor: COLORS.dark.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  historyCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyCardGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyProduct: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.dark.text,
  },
  historyDate: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    marginTop: 4,
  },
  historyPriceContainer: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark.text,
  },
  howToCard: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  howToCardGradient: {
    padding: 16,
    borderRadius: 12,
  },
  howToItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  howToText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark.text,
    marginLeft: 12,
  },
}); 