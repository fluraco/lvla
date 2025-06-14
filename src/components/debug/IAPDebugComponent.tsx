import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { ElementsText } from '../common/wrappers';
import { COLORS, SPACING, BORDER_RADIUS } from '../../theme';
import { IAPService, ProductType } from '../../services/IAPService';
import { supabase } from '../../lib/supabase';
import * as IAP from 'react-native-iap';
import { Platform } from 'react-native';

export function IAPDebugComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('IAP Debug Başlatılmadı');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => `${prev}\n[${timestamp}] ${message}`);
  };

  const clearLogs = () => {
    setDebugInfo('IAP Debug Başlatılmadı');
  };

  const testAuth = async () => {
    try {
      setIsLoading(true);
      addLog('Auth test başlatılıyor...');
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        addLog(`Auth Hatası: ${error.message}`);
        return;
      }
      
      if (user) {
        addLog(`Auth Başarılı: ${user.id}`);
        addLog(`Email: ${user.email}`);
      } else {
        addLog('Kullanıcı bulunamadı');
      }
    } catch (error) {
      addLog(`Auth Test Hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabase = async () => {
    try {
      setIsLoading(true);
      addLog('Database test başlatılıyor...');
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true);

      if (error) {
        addLog(`Database Hatası: ${error.message}`);
        return;
      }

      addLog(`Database Başarılı: ${data?.length || 0} ürün bulundu`);
      
      if (data && data.length > 0) {
        data.forEach(product => {
          addLog(`- ${product.name} (${product.product_type}): ${product.android_product_id}`);
        });
      }
    } catch (error) {
      addLog(`Database Test Hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testIAP = async () => {
    try {
      setIsLoading(true);
      addLog('IAP test başlatılıyor...');
      
      const iapService = IAPService.getInstance();
      
      addLog('IAP servisi initialize ediliyor...');
      await iapService.initialize();
      
      addLog('Ürünler yenileniyor...');
      await iapService.refreshProducts();
      
      addLog('Premium ürünler kontrol ediliyor...');
      const premiumProducts = iapService.getProductsByType(ProductType.SUBSCRIPTION);
      addLog(`Premium ürün sayısı: ${premiumProducts.length}`);
      
      premiumProducts.forEach(product => {
        addLog(`Premium: ${product.productId} - ${product.localizedPrice}`);
      });
      
      addLog('Boost ürünler kontrol ediliyor...');
      const boostProducts = iapService.getProductsByType(ProductType.BOOST);
      addLog(`Boost ürün sayısı: ${boostProducts.length}`);
      
      addLog('SuperLike ürünler kontrol ediliyor...');
      const superlikeProducts = iapService.getProductsByType(ProductType.SUPERLIKE);
      addLog(`SuperLike ürün sayısı: ${superlikeProducts.length}`);
      
      addLog('Kredi ürünler kontrol ediliyor...');
      const creditProducts = iapService.getProductsByType(ProductType.CREDIT);
      addLog(`Kredi ürün sayısı: ${creditProducts.length}`);
      
      addLog('IAP test tamamlandı');
    } catch (error) {
      addLog(`IAP Test Hatası: ${error.message}`);
      console.error('IAP Debug Hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testPremiumPurchase = async () => {
    try {
      setIsLoading(true);
      addLog('Premium satın alma test başlatılıyor...');
      
      const iapService = IAPService.getInstance();
      const result = await iapService.purchasePremiumSubscription();
      
      if (result) {
        addLog('Premium satın alma isteği başarıyla gönderildi');
      } else {
        addLog('Premium satın alma isteği başarısız');
      }
    } catch (error) {
      addLog(`Premium Satın Alma Test Hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Direkt ürünleri al
  const testDirectProducts = async () => {
    try {
      setIsLoading(true);
      addLog('Direkt ürün testi başlatılıyor...');
      
      // IAP bağlantısını kontrol et
      try {
        addLog('IAP bağlantısı başlatılıyor...');
        await IAP.initConnection();
        addLog('IAP bağlantısı başarılı');
      } catch (error) {
        addLog(`IAP bağlantısı başarısız: ${error.message}`);
      }
      
      // Ürün ID'leri
      const productIds = [
        'com.lovlalive.premium.monthly',
        'com.lovlalive.boost.hour1',
        'com.lovlalive.boost.hour3',
        'com.lovlalive.giftcredits.250',
        'com.lovlalive.giftcredits.500',
        'com.lovlalive.giftcredits.1000',
        'com.lovlalive.msgcredits.10',
        'com.lovlalive.msgcredits.50',
        'com.lovlalive.msgcredits.100',
        'com.lovlalive.superlike.pack10',
        'com.lovlalive.superlike.pack20',
        'com.lovlalive.superlike.single'
      ];
      
      // Her bir ürün için deneme yap
      for (const id of productIds) {
        try {
          addLog(`${id} ürün bilgisi alınıyor...`);
          const products = await IAP.getProducts({ skus: [id] });
          
          if (products && products.length > 0) {
            const product = products[0];
            addLog(`✓ ${id}: ${product.title} - ${product.localizedPrice}`);
          } else {
            addLog(`✗ ${id}: Ürün bulunamadı`);
          }
        } catch (error) {
          addLog(`✗ ${id} hatası: ${error.message}`);
        }
      }
      
      addLog('Direkt ürün testi tamamlandı');
    } catch (error) {
      addLog(`Direkt Ürün Test Hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Boost satın alma testi
  const testBoostPurchase = async () => {
    try {
      setIsLoading(true);
      addLog('Boost satın alma testi başlatılıyor...');
      
      const iapService = IAPService.getInstance();
      const boostId = Platform.OS === 'ios' ? 
        'com.lovlalive.boost.hour1' : 
        'com.lovlalive.boost.hour1';
      
      addLog(`Boost ID: ${boostId} ile satın alma deneniyor...`);
      const result = await iapService.purchaseConsumable(boostId);
      
      if (result) {
        addLog('Boost satın alma isteği başarıyla gönderildi');
      } else {
        addLog('Boost satın alma isteği başarısız');
      }
    } catch (error) {
      addLog(`Boost Satın Alma Test Hatası: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ElementsText style={styles.title}>IAP Debug Panel</ElementsText>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.authButton]}
          onPress={testAuth}
          disabled={isLoading}
        >
          <ElementsText style={styles.buttonText}>Auth Test</ElementsText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.databaseButton]}
          onPress={testDatabase}
          disabled={isLoading}
        >
          <ElementsText style={styles.buttonText}>Database Test</ElementsText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.iapButton]}
          onPress={testIAP}
          disabled={isLoading}
        >
          <ElementsText style={styles.buttonText}>IAP Test</ElementsText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.directButton]}
          onPress={testDirectProducts}
          disabled={isLoading}
        >
          <ElementsText style={styles.buttonText}>Direkt Ürünler</ElementsText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.purchaseButton]}
          onPress={testPremiumPurchase}
          disabled={isLoading}
        >
          <ElementsText style={styles.buttonText}>Premium Test</ElementsText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.boostButton]}
          onPress={testBoostPurchase}
          disabled={isLoading}
        >
          <ElementsText style={styles.buttonText}>Boost Test</ElementsText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearLogs}
          disabled={isLoading}
        >
          <ElementsText style={styles.buttonText}>Temizle</ElementsText>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.logContainer}>
        <ElementsText style={styles.logText}>{debugInfo}</ElementsText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    margin: SPACING.md,
    maxHeight: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  button: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
    minWidth: '30%',
  },
  authButton: {
    backgroundColor: '#4CAF50',
  },
  databaseButton: {
    backgroundColor: '#2196F3',
  },
  iapButton: {
    backgroundColor: '#FF9800',
  },
  purchaseButton: {
    backgroundColor: '#9C27B0',
  },
  directButton: {
    backgroundColor: '#795548',
  },
  boostButton: {
    backgroundColor: '#3F51B5',
  },
  clearButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  logContainer: {
    backgroundColor: '#000000',
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    maxHeight: 200,
  },
  logText: {
    color: '#00FF00',
    fontSize: 10,
    fontFamily: 'monospace',
  },
}); 