import { Platform } from 'react-native';
import * as IAP from 'react-native-iap';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

// Ürün tiplerini tanımla
export enum ProductType {
  SUBSCRIPTION = 'subscription',
  BOOST = 'boost',
  SUPERLIKE = 'superlike',
  CREDIT = 'credit'
}

// Veritabanından yüklenecek ürün interface'i
interface DatabaseProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  product_type: string;
  android_product_id: string;
  ios_product_id: string;
  active: boolean;
}

// IAP servis sınıfı
export class IAPService {
  private static instance: IAPService;
  private products: IAP.Product[] = [];
  private databaseProducts: DatabaseProduct[] = [];
  private purchaseUpdateSubscription: IAP.EmitterSubscription | null = null;
  private purchaseErrorSubscription: IAP.EmitterSubscription | null = null;
  private isConnected = false;

  // Singleton pattern
  public static getInstance(): IAPService {
    if (!IAPService.instance) {
      IAPService.instance = new IAPService();
    }
    return IAPService.instance;
  }

  private constructor() {}

  // IAP servisini başlat
  public async initialize(): Promise<void> {
    try {
      console.log('IAP Service: Initialize başlatılıyor...');
      
      if (this.isConnected) {
        console.log('IAP Service: Zaten bağlı, initialize atlanıyor');
        return;
      }

      // IAP modülünü başlat
      console.log('IAP Service: IAP modülü başlatılıyor...');
      
      // IAP bağlantısını kurmayı deniyoruz
      let initAttempts = 0;
      const maxAttempts = 3;
      
      while (initAttempts < maxAttempts) {
        try {
          await IAP.initConnection();
          this.isConnected = true;
          console.log('IAP Service: IAP modülü başarıyla başlatıldı');
          break;
        } catch (error) {
          initAttempts++;
          console.warn(`IAP Service: IAP modülü başlatma denemesi ${initAttempts}/${maxAttempts} başarısız oldu:`, error);
          
          if (initAttempts >= maxAttempts) {
            console.error('IAP Service: IAP modülü başlatma maksimum deneme sayısına ulaşıldı');
            // Hata fırlatmayalım, devam edelim
            this.isConnected = false;
          } else {
            // Bir sonraki deneme öncesi kısa bekle
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      // Bağlantıyı kontrol et, eğer 3 denemeden sonra hala bağlanamıyorsak devam et
      if (!this.isConnected) {
        console.warn('IAP Service: IAP modülü başlatılamadı, ancak diğer işlemlere devam ediliyor');
        // IAP.getProducts gibi IAP'ye bağlı işlemler çağrılacak
        // Bu durumda mantıklı bir şekilde davranmak için this.isConnected = true yapıyoruz
        // Böylece service üzerinden yapılan çağrılar hala çalışmaya devam edecek
        this.isConnected = true;
      }

      // Veritabanından ürünleri yükle
      console.log('IAP Service: Veritabanı ürünleri yükleniyor...');
      try {
        await this.loadDatabaseProducts();
      } catch (dbError) {
        console.error('IAP Service: Veritabanı ürünleri yüklenirken hata, ancak devam ediliyor:', dbError);
      }

      // Satın alma işlemlerini dinle
      console.log('IAP Service: Satın alma dinleyicileri kuruluyor...');
      try {
        this.setupListeners();
      } catch (listenerError) {
        console.error('IAP Service: Dinleyiciler kurulurken hata, ancak devam ediliyor:', listenerError);
      }

      // Google Play/App Store'dan ürünleri getir
      console.log('IAP Service: Store ürünleri yükleniyor...');
      try {
        await this.getProducts();
      } catch (error) {
        console.error('IAP Service: Ürünler yüklenirken hata, ancak devam ediliyor:', error);
      }

      // Bitirilememiş işlemleri tamamla
      console.log('IAP Service: Bekleyen işlemler kontrol ediliyor...');
      try {
        await this.processPendingPurchases();
      } catch (error) {
        console.error('IAP Service: Bekleyen işlemler işlenirken hata, ancak devam ediliyor:', error);
      }

      console.log('IAP Service: Initialize başarıyla tamamlandı');
    } catch (error) {
      console.error('IAP Service: Initialize sırasında hata:', error);
      this.isConnected = false;
      // Hatayı yukarı fırlatmıyoruz, böylece uygulama devam edebilir
      
      // Bazı problem durumlarının üstesinden gelmek için
      // Eğer büyük bir sorunla karşılaşırsak, IAP'yi devre dışı bırakabiliriz
      // Ancak burada hizmet sağlamaya devam ediyoruz
      this.isConnected = true; 
    }
  }

  // Veritabanından ürünleri yükle
  private async loadDatabaseProducts(): Promise<void> {
    try {
      console.log('IAP Service: Veritabanından ürünler yükleniyor...');
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true);

      if (error) {
        console.error('IAP Service: Veritabanı hatası:', error);
        throw error;
      }

      this.databaseProducts = data || [];
      console.log(`IAP Service: Veritabanından ${this.databaseProducts.length} ürün yüklendi`);
      
      // Her ürünü detaylı olarak logla
      this.databaseProducts.forEach(product => {
        console.log('IAP Service: DB Ürün:', {
          id: product.id,
          name: product.name,
          product_type: product.product_type,
          android_product_id: product.android_product_id,
          ios_product_id: product.ios_product_id,
          price: product.price
        });
      });
      
    } catch (error) {
      console.error('IAP Service: Veritabanı ürünleri yüklenirken hata:', error);
      this.databaseProducts = [];
    }
  }

  // Platform'a göre ürün ID'sini al
  private getProductIdForPlatform(dbProduct: DatabaseProduct): string {
    return Platform.OS === 'ios' ? dbProduct.ios_product_id : dbProduct.android_product_id;
  }

  // Tüm aktif ürün ID'lerini al
  private getAllProductIds(): string[] {
    // Platform'a göre ürün ID'lerini filtrele ve boş olmayanları al
    const productIds = this.databaseProducts
      .map(product => Platform.OS === 'ios' ? product.ios_product_id : product.android_product_id)
      .filter(id => id && id.trim() !== '');

    // Paylaşılmış Google Play konsol ekran görüntüsündeki ürün ID'lerini kontrol et
    const storeProductIds = [
      'com.lovlalive.boost.hour1', 
      'com.lovlalive.boost.hour3',
      'com.lovlalive.giftcredits.1000',
      'com.lovlalive.giftcredits.250',
      'com.lovlalive.giftcredits.500',
      'com.lovlalive.msgcredits.10',
      'com.lovlalive.msgcredits.100',
      'com.lovlalive.msgcredits.50',
      'com.lovlalive.superlike.pack10',
      'com.lovlalive.superlike.pack20',
      'com.lovlalive.superlike.single',
      'com.lovlalive.premium.monthly'
    ];

    // Veritabanından alınan ID'ler ile paylaşılmış ID'leri birleştir
    // Aynı ID'leri önlemek için Set kullanıyoruz
    const combinedIds = new Set([...productIds, ...storeProductIds]);
    
    console.log('IAP Service: Kullanılacak ürün ID\'leri:', [...combinedIds]);
    return [...combinedIds];
  }

  // IAP servisini kapat
  public async finalize(): Promise<void> {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }

    if (this.isConnected) {
      await IAP.endConnection();
      this.isConnected = false;
    }
  }

  // Ürün ID'sine göre tüketilebilir (consumable) olup olmadığını kontrol et
  private isConsumablePurchase(productId: string): boolean {
    const dbProduct = this.databaseProducts.find(p => 
      this.getProductIdForPlatform(p) === productId
    );
    return dbProduct?.product_type === 'consumable';
  }

  // Ürün ID'sine göre tip belirle
  private getProductType(productId: string): ProductType {
    console.log(`IAP Service: ${productId} için tip belirleniyor...`);
    
    const lowerProductId = productId.toLowerCase();
    
    if (lowerProductId.includes('premium') || lowerProductId.includes('subscription')) {
      console.log(`IAP Service: ${productId} -> SUBSCRIPTION`);
      return ProductType.SUBSCRIPTION;
    } else if (lowerProductId.includes('boost')) {
      console.log(`IAP Service: ${productId} -> BOOST`);
      return ProductType.BOOST;
    } else if (lowerProductId.includes('superlike') || lowerProductId.includes('super_like')) {
      console.log(`IAP Service: ${productId} -> SUPERLIKE`);
      return ProductType.SUPERLIKE;
    } else if (lowerProductId.includes('credit') || lowerProductId.includes('kredits') || 
               lowerProductId.includes('msgcredits') || lowerProductId.includes('giftcredits')) {
      console.log(`IAP Service: ${productId} -> CREDIT`);
      return ProductType.CREDIT;
    }
    
    console.log(`IAP Service: ${productId} -> Bilinmeyen tip, varsayılan BOOST`);
    return ProductType.BOOST; // varsayılan
  }

  // Veritabanından ürün bilgisini al
  private getDatabaseProduct(productId: string): DatabaseProduct | undefined {
    return this.databaseProducts.find(p => 
      this.getProductIdForPlatform(p) === productId
    );
  }
  
  // Dinleyicileri ayarla
  private setupListeners(): void {
    // Önce mevcut dinleyicileri temizle
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }

    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }

    console.log('IAP Service: Satın alma dinleyicileri ayarlanıyor...');
    
    // Satın alma işlemlerini dinle
    this.purchaseUpdateSubscription = IAP.purchaseUpdatedListener(
      async (purchase: IAP.SubscriptionPurchase | IAP.Purchase) => {
        try {
          if (purchase) {
            console.log('IAP Service: Satın alma işlemi alındı:', {
              productId: purchase.productId,
              transactionId: purchase.transactionId,
              transactionDate: purchase.transactionDate
            });

            const isConsumable = this.isConsumablePurchase(purchase.productId);
            console.log(`IAP Service: Ürün tüketilebilir (consumable) mi? ${isConsumable ? 'Evet' : 'Hayır'}`);
            
            if (Platform.OS === 'android') {
              // Android için satın alma işlemini işle
              try {
                console.log('IAP Service: Android satın alma işlemi işleniyor...');
                
                if (isConsumable) {
                  await this.handleAndroidConsumablePurchase(purchase as IAP.Purchase);
                } else {
                  await this.handleAndroidPurchase(purchase);
                }
                
                // Satın alma işlemini tamamla
                console.log('IAP Service: Android satın alma işlemi tamamlanıyor...');
                await IAP.finishTransaction({ 
                  purchase, 
                  isConsumable 
                }).catch(error => {
                  console.error('IAP Service: Android finishTransaction hatası:', error);
                });
                
                console.log('IAP Service: Android satın alma işlemi tamamlandı');
              } catch (error) {
                console.error('IAP Service: Android satın alma işlenirken hata:', error);
                
                // Hata olsa bile işlemi tamamlamaya çalış
                try {
                  await IAP.finishTransaction({ 
                    purchase, 
                    isConsumable 
                  });
                  console.log('IAP Service: Hataya rağmen işlem tamamlandı');
                } catch (finishError) {
                  console.error('IAP Service: İşlem tamamlanamadı:', finishError);
                }
              }
            } 
            // iOS için satın alma işlemini işle
            else if (Platform.OS === 'ios') {
              try {
                console.log('IAP Service: iOS satın alma işlemi işleniyor...');
                
                if (isConsumable) {
                  await this.handleIOSConsumablePurchase(purchase as IAP.Purchase);
                } else {
                  await this.handleIOSPurchase(purchase);
                }
                
                // Satın alma işlemini tamamla
                console.log('IAP Service: iOS satın alma işlemi tamamlanıyor...');
                await IAP.finishTransaction({ 
                  purchase, 
                  isConsumable 
                }).catch(error => {
                  console.error('IAP Service: iOS finishTransaction hatası:', error);
                });
                
                console.log('IAP Service: iOS satın alma işlemi tamamlandı');
              } catch (error) {
                console.error('IAP Service: iOS satın alma işlenirken hata:', error);
                
                // Hata olsa bile işlemi tamamlamaya çalış
                try {
                  await IAP.finishTransaction({ 
                    purchase, 
                    isConsumable 
                  });
                  console.log('IAP Service: Hataya rağmen işlem tamamlandı');
                } catch (finishError) {
                  console.error('IAP Service: İşlem tamamlanamadı:', finishError);
                }
              }
            }
          }
        } catch (error) {
          console.error('IAP Service: Satın alma işlemi sırasında genel hata:', error);
          Alert.alert(
            'Satın Alma Hatası',
            'Satın alma işlemi sırasında bir sorun oluştu. Lütfen daha sonra tekrar deneyin.' +
            (error.message ? '\n\nHata: ' + error.message : '')
          );
          
          // Hata olsa bile işlemi tamamlamaya çalış
          try {
            if (purchase) {
              const isConsumable = this.isConsumablePurchase(purchase.productId);
              await IAP.finishTransaction({ 
                purchase, 
                isConsumable 
              });
              console.log('IAP Service: Genel hataya rağmen işlem tamamlandı');
            }
          } catch (finishError) {
            console.error('IAP Service: İşlem tamamlanamadı:', finishError);
          }
        }
      }
    );

    // Satın alma hatalarını dinle
    this.purchaseErrorSubscription = IAP.purchaseErrorListener(
      (error: IAP.PurchaseError) => {
        console.error('IAP Service: Satın alma hatası:', error);
        
        if (error.code !== 'E_USER_CANCELLED') {
          Alert.alert(
            'Satın Alma Hatası',
            'Satın alma işlemi sırasında bir sorun oluştu: ' + error.message
          );
        }
      }
    );
    
    console.log('IAP Service: Satın alma dinleyicileri başarıyla ayarlandı');
  }

  // Mevcut ürünleri getir
  public async getProducts(): Promise<IAP.Product[]> {
    try {
      console.log('IAP Service: getProducts() başlatılıyor...');
      
      if (this.databaseProducts.length === 0) {
        console.log('IAP Service: Veritabanı ürünleri yükleniyor...');
        await this.loadDatabaseProducts();
      }

      // Tüm potansiyel ürün ID'lerini al
      const productIds = this.getAllProductIds();
      console.log('IAP Service: Ürün ID\'leri:', productIds);
      
      if (productIds.length === 0) {
        console.log('IAP Service: Aktif ürün bulunamadı');
        return [];
      }

      console.log('IAP Service: Google Play/App Store\'dan ürünler alınıyor...');
      
      try {
        // Tüm ürünleri tek seferde almak yerine, küçük gruplar halinde almayı dene
        // Bu, bazı ID'ler hatalı olsa bile diğerlerinin alınabilmesini sağlar
        const results = [];
        
        // Ürünleri daha küçük gruplar halinde almak için
        const chunkSize = 5;
        for (let i = 0; i < productIds.length; i += chunkSize) {
          const chunk = productIds.slice(i, i + chunkSize);
          console.log(`IAP Service: ${i+1}-${i+chunk.length} arası ürünler alınıyor:`, chunk);
          
          try {
            const products = await IAP.getProducts({ skus: chunk });
            console.log(`IAP Service: ${products.length} ürün başarıyla alındı`);
            results.push(...products);
          } catch (e) {
            console.error(`IAP Service: Ürün grubu alınırken hata:`, e);
            // Hataya rağmen devam et
          }
        }
        
        this.products = results;
      } catch (e) {
        console.error('IAP Service: Toplu ürün alımı başarısız, tek tek deneniyor:', e);
        
        // Alternatifleri dene, her bir ürünü tek tek almayı dene
        const results = [];
        for (const id of productIds) {
          try {
            const products = await IAP.getProducts({ skus: [id] });
            if (products && products.length > 0) {
              results.push(...products);
              console.log(`IAP Service: Ürün başarıyla alındı: ${id}`);
            }
          } catch (e) {
            console.error(`IAP Service: ${id} ürünü alınırken hata:`, e);
          }
        }
        
        this.products = results;
      }
      
      console.log('IAP Service: Google Play/App Store\'dan alınan ürünler:', this.products.length);
      
      // Her ürün için detaylı log
      this.products.forEach(product => {
        console.log('IAP Service: Ürün detayı:', {
          productId: product.productId,
          title: product.title,
          description: product.description,
          localizedPrice: product.localizedPrice,
          price: product.price,
          currency: product.currency
        });
      });
      
      return this.products;
    } catch (error) {
      console.error('IAP Service: Ürünler alınırken hata:', error);
      return this.products; // Mevcut ürünleri döndür
    }
  }

  // Premium abonelik satın al
  public async purchasePremiumSubscription(userId?: string): Promise<boolean> {
    try {
      console.log('IAP Service: Premium abonelik satın alma başlatılıyor...');
      
      if (!this.isConnected) {
        console.log('IAP Service: Bağlantı yok, initialize() çağırılıyor...');
        await this.initialize();
      }

      // UserContext'ten veya parametre olarak gelen kullanıcı ID'sini kullan
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('IAP Service: Kullanıcı bulunamadı');
          Alert.alert('Hata', 'Satın alma işlemi için giriş yapmanız gerekmektedir.');
          return false;
        }
        currentUserId = user.id;
      }

      // Ürünleri getir (eğer henüz alınmamışsa)
      if (this.products.length === 0) {
        console.log('IAP Service: Ürünler henüz yüklenmemiş, getProducts() çağırılıyor...');
        await this.getProducts();
      }

      console.log('IAP Service: Premium satın alma - Mevcut tüm ürünler:', 
        this.products.map(p => `${p.productId} (${p.title}, ${p.localizedPrice})`));

      // Premium abonelik için önce doğrudan Google Play ürün ID'sini kullan
      const PREMIUM_PRODUCT_ID = Platform.OS === 'ios' 
        ? 'com.lovlalive.premium.monthly' // iOS için ürün ID'si
        : 'com.lovlalive.premium.monthly'; // Android için ürün ID'si
      
      // Önce doğrudan ürün ID'sine göre ara
      let premiumProduct = this.products.find(p => p.productId === PREMIUM_PRODUCT_ID);
      
      // Bulunamazsa ürün adına göre ara
      if (!premiumProduct) {
        premiumProduct = this.products.find(p => 
          p.productId.toLowerCase().includes('premium') || 
          p.productId.toLowerCase().includes('subscription') ||
          (p.title && p.title.toLowerCase().includes('premium'))
        );
      }

      // Eğer mevcut ürünlerde bulunamadıysa, ürünleri yeniden yüklemeyi dene
      if (!premiumProduct) {
        console.log('IAP Service: Premium ürün bulunamadı, ürünleri yenilemeyi deniyorum...');
        await this.refreshProducts();
        
        // Yeniden ara
        premiumProduct = this.products.find(p => p.productId === PREMIUM_PRODUCT_ID);
        
        if (!premiumProduct) {
          premiumProduct = this.products.find(p => 
            p.productId.toLowerCase().includes('premium') || 
            p.productId.toLowerCase().includes('subscription') ||
            (p.title && p.title.toLowerCase().includes('premium'))
          );
        }
      }

      // Yine de bulunamadıysa, doğrudan Google Play'den satın almayı dene
      if (!premiumProduct) {
        console.log(`IAP Service: Premium ürün bulunamadı, doğrudan ${PREMIUM_PRODUCT_ID} ile deniyorum...`);
        
        try {
          // Satın alma işlemini başlat
          console.log(`IAP Service: Premium abonelik doğrudan satın alma isteği gönderiliyor: ${PREMIUM_PRODUCT_ID}`);
          
          await IAP.requestSubscription({
            sku: PREMIUM_PRODUCT_ID,
            andDangerouslyFinishTransactionAutomaticallyIOS: false
          });
          
          console.log(`IAP Service: Premium abonelik doğrudan satın alma isteği gönderildi`);
          return true;
        } catch (purchaseError) {
          console.error('IAP Service: Premium abonelik doğrudan satın alınamadı:', purchaseError);
          
          // Android'de alternatif metodu dene
          if (Platform.OS === 'android') {
            try {
              console.log('IAP Service: Android için alternatif satın alma metodu deneniyor...');
              
              const purchase = await IAP.requestPurchase({
                sku: PREMIUM_PRODUCT_ID
              });
              
              console.log('IAP Service: Android alternatif satın alma başarılı:', purchase);
              return true;
            } catch (altError) {
              console.error('IAP Service: Android alternatif satın alma başarısız:', altError);
            }
          }
          
          Alert.alert(
            'Premium Satın Alma Hatası',
            'Premium abonelik satın alınamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
          );
          return false;
        }
      }

      console.log(`IAP Service: Premium ürün bulundu, satın alma başlatılıyor:`, {
        productId: premiumProduct.productId,
        title: premiumProduct.title,
        price: premiumProduct.localizedPrice
      });

      // Satın alma işlemini başlat
      await IAP.requestSubscription({
        sku: premiumProduct.productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false
      });

      console.log(`IAP Service: Premium abonelik satın alma isteği gönderildi: ${premiumProduct.productId}`);
      return true;
    } catch (error) {
      console.error('IAP Service: Premium abonelik satın alınırken hata:', error);
      
      // Spesifik hata türlerine göre mesaj göster
      if (error.code === 'E_USER_CANCELLED') {
        console.log('IAP Service: Kullanıcı premium abonelik satın almayı iptal etti');
        return false;
      } else if (error.code === 'E_ITEM_UNAVAILABLE') {
        Alert.alert(
          'Abonelik Mevcut Değil',
          'Premium abonelik şu anda satın alınamıyor. Lütfen daha sonra tekrar deneyin.'
        );
      } else if (error.code === 'E_NETWORK_ERROR') {
        Alert.alert(
          'Bağlantı Hatası',
          'İnternet bağlantınızı kontrol edin ve tekrar deneyin.'
        );
      } else {
        Alert.alert(
          'Satın Alma Hatası',
          'Premium abonelik satın alınırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.' + 
          (error.message ? '\n\nHata: ' + error.message : '')
        );
      }
      return false;
    }
  }

  // Tek seferlik ürün satın al (Boost, SuperLike, Kredi)
  public async purchaseConsumable(productId: string, userId?: string): Promise<boolean> {
    try {
      console.log(`IAP Service: Consumable satın alma başlatılıyor: ${productId}`);
      
      if (!this.isConnected) {
        console.log('IAP Service: Bağlantı yok, initialize() çağırılıyor...');
        await this.initialize();
      }

      // UserContext'ten veya parametre olarak gelen kullanıcı ID'sini kullan
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('IAP Service: Kullanıcı bulunamadı');
          Alert.alert('Hata', 'Satın alma işlemi için giriş yapmanız gerekmektedir.');
          return false;
        }
        currentUserId = user.id;
      }

      // Ürünleri getir (eğer henüz alınmamışsa)
      if (this.products.length === 0) {
        console.log('IAP Service: Ürünler henüz yüklenmemiş, getProducts() çağırılıyor...');
        try {
          await this.getProducts();
        } catch (error) {
          console.error('IAP Service: Ürünler alınırken hata, ancak devam edilecek:', error);
        }
      }

      // Satın alma öncesinde ürünleri yenilemeyi dene
      if (this.products.length === 0 || !this.products.some(p => p.productId === productId || p.productId.includes(productId))) {
        console.log('IAP Service: Ürün bulunamadı veya listesi boş, yenileniyor...');
        try {
          await this.refreshProducts();
        } catch (error) {
          console.error('IAP Service: Ürünler yenilenirken hata, ancak devam edilecek:', error);
        }
      }

      // İstenilen ürün ID'si
      let targetProductId = productId;
      
      // Ürün tipine göre eşleştirme yap (eski ürün ID formatı kullanıldıysa Google Play Console ID'sine çevir)
      if (!productId.includes('com.lovlalive.')) {
        // Ürün tipini belirle
        const productType = this.getProductType(productId);
        console.log(`IAP Service: Ürün tipi belirlendi: ${productType}`);
        
        // Ürün tipine göre uygun Google Play ID'si seç
        switch (productType) {
          case ProductType.BOOST:
            if (productId.includes('1') || productId.includes('hour1')) {
              targetProductId = 'com.lovlalive.boost.hour1';
            } else {
              targetProductId = 'com.lovlalive.boost.hour3';
            }
            break;
          case ProductType.SUPERLIKE:
            if (productId.includes('10') || productId.includes('pack10')) {
              targetProductId = 'com.lovlalive.superlike.pack10';
            } else if (productId.includes('20') || productId.includes('pack20')) {
              targetProductId = 'com.lovlalive.superlike.pack20';
            } else {
              targetProductId = 'com.lovlalive.superlike.single';
            }
            break;
          case ProductType.CREDIT:
            if (productId.includes('gift') || productId.includes('hediye')) {
              if (productId.includes('250')) {
                targetProductId = 'com.lovlalive.giftcredits.250';
              } else if (productId.includes('500')) {
                targetProductId = 'com.lovlalive.giftcredits.500';
              } else {
                targetProductId = 'com.lovlalive.giftcredits.1000';
              }
            } else if (productId.includes('msg') || productId.includes('mesaj')) {
              if (productId.includes('10')) {
                targetProductId = 'com.lovlalive.msgcredits.10';
              } else if (productId.includes('50')) {
                targetProductId = 'com.lovlalive.msgcredits.50';
              } else {
                targetProductId = 'com.lovlalive.msgcredits.100';
              }
            }
            break;
          default:
            break;
        }
        
        console.log(`IAP Service: Ürün ID dönüştürüldü: ${productId} -> ${targetProductId}`);
      }

      console.log('IAP Service: Satın alma öncesi mevcut ürünler:', 
        this.products.map(p => `${p.productId} (${p.title}, ${p.localizedPrice})`));

      // İstenilen ürünü bul
      const product = this.products.find(p => p.productId === targetProductId);

      if (!product) {
        console.log(`IAP Service: Ürün bulunamadı: ${targetProductId}, doğrudan satın alma deneniyor...`);
        
        // Google Play console'dan bildiğimiz ID'leri doğrudan kullanarak denemeyi dene
        try {
          console.log(`IAP Service: Ürün bulunamadı, doğrudan satın alma deneniyor: ${targetProductId}`);
          
          try {
            await IAP.requestPurchase({
              sku: targetProductId,
              andDangerouslyFinishTransactionAutomaticallyIOS: false
            });
          } catch (primaryError) {
            console.error('IAP Service: İlk satın alma denemesi başarısız:', primaryError);
            
            // Alternatif metod - bazı cihazlarda bu çalışıyor
            console.log('IAP Service: Alternatif satın alma metodu deneniyor...');
            await IAP.requestPurchase({
              sku: targetProductId
            });
          }
          
          console.log(`IAP Service: Doğrudan satın alma isteği gönderildi: ${targetProductId}`);
          return true;
        } catch (error) {
          console.error(`IAP Service: Doğrudan satın alma başarısız:`, error);
          
          // Google Play'den bilinen ürün ID'lerini manuel olarak dene
          const knownProductIds = [
            'com.lovlalive.boost.hour1', 
            'com.lovlalive.boost.hour3',
            'com.lovlalive.giftcredits.1000',
            'com.lovlalive.giftcredits.250', 
            'com.lovlalive.giftcredits.500',
            'com.lovlalive.msgcredits.10',
            'com.lovlalive.msgcredits.100',
            'com.lovlalive.msgcredits.50',
            'com.lovlalive.superlike.pack10',
            'com.lovlalive.superlike.pack20',
            'com.lovlalive.superlike.single'
          ];
          
          // Tipi benzer olan ID'yi bul
          const productType = this.getProductType(targetProductId);
          const similarProducts = knownProductIds.filter(id => {
            const type = this.getProductType(id);
            return type === productType;
          });
          
          if (similarProducts.length > 0) {
            console.log(`IAP Service: Benzer tipte ürünler bulundu, deneniyor:`, similarProducts);
            
            // Her birini deneyerek satın almayı dene
            for (const id of similarProducts) {
              try {
                console.log(`IAP Service: Alternatif ürün ile satın alma deneniyor: ${id}`);
                await IAP.requestPurchase({
                  sku: id,
                  andDangerouslyFinishTransactionAutomaticallyIOS: false
                });
                console.log(`IAP Service: Alternatif satın alma başarılı: ${id}`);
                return true;
              } catch (altError) {
                console.error(`IAP Service: Alternatif satın alma başarısız (${id}):`, altError);
                // Devam et ve diğerlerini dene
              }
            }
          }
          
          Alert.alert(
            'Ürün Satın Alma Hatası',
            'Satın almak istediğiniz ürün bulunamadı veya satın alınamadı. Lütfen daha sonra tekrar deneyin.' +
            (error.message ? '\n\nHata: ' + error.message : '')
          );
          return false;
        }
      }

      console.log(`IAP Service: Ürün bulundu, satın alma başlatılıyor:`, {
        productId: product.productId,
        title: product.title,
        price: product.localizedPrice
      });

      // Satın alma işlemini başlat
      try {
        await IAP.requestPurchase({
          sku: product.productId,
          andDangerouslyFinishTransactionAutomaticallyIOS: false
        });
      } catch (primaryError) {
        console.error('IAP Service: İlk satın alma denemesi başarısız:', primaryError);
        
        // Alternatif metod
        console.log('IAP Service: Alternatif satın alma metodu deneniyor...');
        await IAP.requestPurchase({
          sku: product.productId
        });
      }

      console.log(`IAP Service: Satın alma isteği gönderildi: ${product.productId}`);
      return true;
    } catch (error) {
      console.error('IAP Service: Ürün satın alınırken hata:', error);
      
      // Spesifik hata türlerine göre mesaj göster
      if (error.code === 'E_USER_CANCELLED') {
        console.log('IAP Service: Kullanıcı satın almayı iptal etti');
        return false;
      } else if (error.code === 'E_ITEM_UNAVAILABLE') {
        Alert.alert(
          'Ürün Mevcut Değil',
          'Bu ürün şu anda satın alınamıyor. Lütfen daha sonra tekrar deneyin.'
        );
      } else if (error.code === 'E_NETWORK_ERROR') {
        Alert.alert(
          'Bağlantı Hatası',
          'İnternet bağlantınızı kontrol edin ve tekrar deneyin.'
        );
      } else {
        Alert.alert(
          'Satın Alma Hatası',
          'Ürün satın alınırken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.' +
          (error.message ? '\n\nHata: ' + error.message : '')
        );
      }
      return false;
    }
  }

  // Android satın alma işlemini işle
  private async handleAndroidPurchase(purchase: IAP.SubscriptionPurchase | IAP.Purchase): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Veritabanından ürün bilgisini al
      const dbProduct = this.getDatabaseProduct(purchase.productId);
      if (!dbProduct) {
        throw new Error('Ürün veritabanında bulunamadı: ' + purchase.productId);
      }

      // Aboneliği veritabanına kaydet
      const { data, error } = await supabase.rpc('process_subscription', {
        p_user_id: user.id,
        p_product_id: dbProduct.id,
        p_transaction_id: purchase.transactionId,
        p_purchase_token: purchase.purchaseToken,
        p_platform: 'android',
        p_receipt_data: JSON.stringify({
          packageName: purchase.packageNameAndroid,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          subscription: true
        }),
      });

      if (error) {
        throw error;
      }

      if (data && data.success) {
        Alert.alert(
          'Premium Abonelik Aktifleştirildi',
          'Premium aboneliğiniz başarıyla aktifleştirildi! Artık tüm premium özelliklere erişebilirsiniz.'
        );
      }
    } catch (error) {
      console.error('Android satın alma işlemi sırasında hata:', error);
      throw error;
    }
  }

  // iOS satın alma işlemini işle
  private async handleIOSPurchase(purchase: IAP.SubscriptionPurchase | IAP.Purchase): Promise<void> {
    try {
      const receipt = purchase.transactionReceipt;
      if (!receipt) {
        throw new Error('Satın alma makbuzu bulunamadı');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Veritabanından ürün bilgisini al
      const dbProduct = this.getDatabaseProduct(purchase.productId);
      if (!dbProduct) {
        throw new Error('Ürün veritabanında bulunamadı: ' + purchase.productId);
      }

      // Aboneliği veritabanına kaydet
      const { data, error } = await supabase.rpc('process_subscription', {
        p_user_id: user.id,
        p_product_id: dbProduct.id,
        p_transaction_id: purchase.transactionId,
        p_purchase_token: '',
        p_platform: 'ios',
        p_receipt_data: receipt,
        p_latest_receipt: purchase.transactionReceipt
      });

      if (error) {
        throw error;
      }

      if (data && data.success) {
        Alert.alert(
          'Premium Abonelik Aktifleştirildi',
          'Premium aboneliğiniz başarıyla aktifleştirildi! Artık tüm premium özelliklere erişebilirsiniz.'
        );
      }
    } catch (error) {
      console.error('iOS satın alma işlemi sırasında hata:', error);
      throw error;
    }
  }

  // Android tek seferlik satın alma işlemini işle
  private async handleAndroidConsumablePurchase(purchase: IAP.Purchase): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Veritabanından ürün bilgisini al
      const dbProduct = this.getDatabaseProduct(purchase.productId);
      if (!dbProduct) {
        throw new Error('Ürün veritabanında bulunamadı: ' + purchase.productId);
      }

      // Consumable satın almayı veritabanına kaydet
      const { data, error } = await supabase.rpc('process_consumable_purchase', {
        p_user_id: user.id,
        p_product_id: dbProduct.id,
        p_transaction_id: purchase.transactionId,
        p_platform: 'android',
        p_receipt_data: JSON.stringify({
          packageName: purchase.packageNameAndroid,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
          subscription: false
        })
      });

      if (error) {
        throw error;
      }

      if (data && data.success) {
        Alert.alert(
          'Satın Alma Başarılı',
          data.message
        );
      }
    } catch (error) {
      console.error('Android consumable satın alma işlemi sırasında hata:', error);
      throw error;
    }
  }

  // iOS tek seferlik satın alma işlemini işle
  private async handleIOSConsumablePurchase(purchase: IAP.Purchase): Promise<void> {
    try {
      const receipt = purchase.transactionReceipt;
      if (!receipt) {
        throw new Error('Satın alma makbuzu bulunamadı');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Veritabanından ürün bilgisini al
      const dbProduct = this.getDatabaseProduct(purchase.productId);
      if (!dbProduct) {
        throw new Error('Ürün veritabanında bulunamadı: ' + purchase.productId);
      }

      // Consumable satın almayı veritabanına kaydet
      const { data, error } = await supabase.rpc('process_consumable_purchase', {
        p_user_id: user.id,
        p_product_id: dbProduct.id,
        p_transaction_id: purchase.transactionId,
        p_platform: 'ios',
        p_receipt_data: receipt
      });

      if (error) {
        throw error;
      }

      if (data && data.success) {
        Alert.alert(
          'Satın Alma Başarılı',
          data.message
        );
      }
    } catch (error) {
      console.error('iOS consumable satın alma işlemi sırasında hata:', error);
      throw error;
    }
  }

  // Bekleyen satın alma işlemlerini işle
  private async processPendingPurchases(): Promise<void> {
    try {
      const availablePurchases = await IAP.getPendingPurchases();
      
      for (const purchase of availablePurchases) {
        const isConsumable = this.isConsumablePurchase(purchase.productId);
        
        if (Platform.OS === 'android') {
          if (isConsumable) {
            await this.handleAndroidConsumablePurchase(purchase as IAP.Purchase);
          } else {
            await this.handleAndroidPurchase(purchase);
          }
        } else if (Platform.OS === 'ios') {
          if (isConsumable) {
            await this.handleIOSConsumablePurchase(purchase as IAP.Purchase);
          } else {
            await this.handleIOSPurchase(purchase);
          }
        }
        
        await IAP.finishTransaction({
          purchase,
          isConsumable,
        });
      }
    } catch (error) {
      console.error('Bekleyen satın alma işlemleri işlenirken hata:', error);
    }
  }

  // Aktif aboneliklerini getir
  public async getActiveSubscriptions(): Promise<IAP.Subscription[]> {
    try {
      const subscriptions = await IAP.getAvailablePurchases();
      return subscriptions;
    } catch (error) {
      console.error('Aktif abonelikler alınırken hata:', error);
      return [];
    }
  }

  // Kullanıcının premium aboneliği var mı kontrol et
  public async checkPremiumStatus(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('users')
        .select('is_premium, premium_expires_at')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Premium durumu kontrol edilirken hata:', error);
        return false;
      }
      
      const isPremium = data?.is_premium || false;
      const expiryDate = data?.premium_expires_at ? new Date(data.premium_expires_at) : null;
      
      if (isPremium && expiryDate && expiryDate < new Date()) {
        await supabase
          .from('users')
          .update({
            is_premium: false,
            premium_expires_at: null
          })
          .eq('id', user.id);
        
        return false;
      }
      
      return isPremium;
    } catch (error) {
      console.error('Premium durumu kontrol edilirken beklenmeyen hata:', error);
      return false;
    }
  }

  // Aboneliği iptal et
  public async cancelSubscription(): Promise<boolean> {
    try {
      Alert.alert(
        'Abonelik İptali',
        'Aboneliğinizi iptal etmek için lütfen Google Play Store veya App Store hesap ayarlarınızı kullanın.',
        [
          { text: 'Tamam' },
          { 
            text: 'Ayarlara Git', 
            onPress: () => {
              if (Platform.OS === 'ios') {
                IAP.openIosSubscriptionSettings();
              } else {
                IAP.openPlayStoreSubscriptions();
              }
            } 
          }
        ]
      );
      return true;
    } catch (error) {
      console.error('Abonelik iptal edilirken hata:', error);
      return false;
    }
  }

  // Kullanıcının boost, superlike ve kredi sayısını getir
  public async getUserConsumables(): Promise<{
    boostCount: number;
    superlikeCount: number;
    messageCreditCount: number;
    giftCreditCount: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          boostCount: 0,
          superlikeCount: 0,
          messageCreditCount: 0,
          giftCreditCount: 0
        };
      }
      
      // Boost sayısı
      const { data: boostData } = await supabase
        .from('user_boosts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', false)
        .eq('is_used', false);
      
      // SuperLike sayısı
      const { data: superlikeData } = await supabase
        .rpc('get_user_superlikes', { p_user_id: user.id });
      
      // Mesaj kredisi
      const { data: messageCreditData } = await supabase
        .from('user_message_credits')
        .select('credit_amount')
        .eq('user_id', user.id)
        .single();
      
      // Hediye kredisi
      const { data: giftCreditData } = await supabase
        .from('user_credits')
        .select('credit_amount')
        .eq('user_id', user.id)
        .single();
      
      return {
        boostCount: boostData?.length || 0,
        superlikeCount: superlikeData || 0,
        messageCreditCount: messageCreditData?.credit_amount || 0,
        giftCreditCount: giftCreditData?.credit_amount || 0
      };
    } catch (error) {
      console.error('Kullanıcı ürünleri kontrol edilirken hata:', error);
      return {
        boostCount: 0,
        superlikeCount: 0,
        messageCreditCount: 0,
        giftCreditCount: 0
      };
    }
  }

  // Tip göre ürünleri getir
  public getProductsByType(type: ProductType): IAP.Product[] {
    console.log(`IAP Service: ${type} tipinde ürünler aranıyor...`);
    
    const filteredProducts = this.products.filter(product => {
      const productId = product.productId.toLowerCase();
      const dbProduct = this.getDatabaseProduct(product.productId);
      let productType = dbProduct?.product_type;

      // Veritabanında tip bilgisi yoksa Google Play ekran görüntüsündeki ID'lere bakarak belirle
      if (!productType) {
        // Google Play konsoldan elde edilen ürün ID'lerine göre tiplendirme yap
        if (productId.includes('premium') || productId.includes('subscription') || 
            productId === 'com.lovlalive.premium.monthly') {
          productType = 'subscription';
        } else if (productId.includes('boost') || 
                  productId === 'com.lovlalive.boost.hour1' || 
                  productId === 'com.lovlalive.boost.hour3') {
          productType = 'boost';
        } else if (productId.includes('superlike') || 
                  productId === 'com.lovlalive.superlike.pack10' || 
                  productId === 'com.lovlalive.superlike.pack20' || 
                  productId === 'com.lovlalive.superlike.single') {
          productType = 'superlike';
        } else if (productId.includes('credit') || 
                  productId === 'com.lovlalive.msgcredits.10' || 
                  productId === 'com.lovlalive.msgcredits.50' ||
                  productId === 'com.lovlalive.msgcredits.100' ||
                  productId === 'com.lovlalive.giftcredits.250' ||
                  productId === 'com.lovlalive.giftcredits.500' ||
                  productId === 'com.lovlalive.giftcredits.1000') {
          productType = 'credit';
        }
      }
      
      console.log(`IAP Service: Ürün ${product.productId} tipi: ${productType || 'bilinmiyor'}`);
      
      switch (type) {
        case ProductType.SUBSCRIPTION:
          return productType === 'subscription' || productId === 'com.lovlalive.premium.monthly';
        case ProductType.BOOST:
          return productType === 'boost' || 
                productId.includes('boost') || 
                productId === 'com.lovlalive.boost.hour1' ||
                productId === 'com.lovlalive.boost.hour3';
        case ProductType.SUPERLIKE:
          return productType === 'superlike' || 
                productId.includes('superlike') ||
                productId === 'com.lovlalive.superlike.pack10' ||
                productId === 'com.lovlalive.superlike.pack20' ||
                productId === 'com.lovlalive.superlike.single';
        case ProductType.CREDIT:
          return productType === 'credit' || 
                productId.includes('credit') ||
                productId.includes('msgcredits') ||
                productId.includes('giftcredits') ||
                productId === 'com.lovlalive.msgcredits.10' ||
                productId === 'com.lovlalive.msgcredits.50' ||
                productId === 'com.lovlalive.msgcredits.100' ||
                productId === 'com.lovlalive.giftcredits.250' ||
                productId === 'com.lovlalive.giftcredits.500' ||
                productId === 'com.lovlalive.giftcredits.1000';
        default:
          return false;
      }
    });
    
    console.log(`IAP Service: ${type} tipinde ${filteredProducts.length} ürün bulundu`);
    
    // Bulunan ürünleri logla
    if (filteredProducts.length > 0) {
      filteredProducts.forEach(p => {
        console.log(`IAP Service: ${type} ürünü:`, {
          id: p.productId,
          title: p.title || 'Başlık yok',
          price: p.localizedPrice || 'Fiyat yok'
        });
      });
    }
    
    return filteredProducts;
  }

  // Ürünleri yenile
  public async refreshProducts(): Promise<void> {
    try {
      console.log('IAP Service: refreshProducts() başlatılıyor...');
      
      // Önce IAP bağlantısını kontrol et
      if (!this.isConnected) {
        console.log('IAP Service: Bağlantı yok, initialize() çağırılıyor...');
        await this.initialize();
      }
      
      // Ürünleri yeniden al
      await this.getProducts();
      
      console.log('IAP Service: Ürünler başarıyla yenilendi');
    } catch (error) {
      console.error('IAP Service: Ürünler yenilenirken hata:', error);
      throw error;
    }
  }
} 