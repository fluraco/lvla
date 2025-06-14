import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { ElementsText } from '../../../components/common/wrappers';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useUser } from '../../../contexts/UserContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';
import { RootStackParamList } from '../../../types/navigation';

type UserProfileRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

export function UserProfileScreen() {
  const route = useRoute<UserProfileRouteProp>();
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user: currentUser } = useUser();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchStatus, setMatchStatus] = useState<'none' | 'liked' | 'matched'>('none');
  const [showActions, setShowActions] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);
  
  // Raporlama için yeni state'ler
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  
  // Profil bilgilerini yükle
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Kullanıcı bilgilerini veritabanından getir
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error('Kullanıcı bilgileri alınamadı:', error);
          return;
        }
        
        if (data) {
          setUser(data);
          checkMatchStatus(data.id);
          
          // Engelleme durumunu kontrol et
          if (currentUser) {
            checkBlockStatus(currentUser.id, data.id);
          }
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri yüklenirken hata oluştu:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId, currentUser]);

  // Engelleme durumunu kontrol et
  const checkBlockStatus = async (currentUserId: string, targetUserId: string) => {
    try {
      // Kullanıcının karşı tarafı engelleyip engellemediğini kontrol et
      const { data: blockedByUser, error: blockError } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', currentUserId)
        .eq('blocked_user_id', targetUserId)
        .maybeSingle();
      
      if (blockError) {
        console.error('Engelleme durumu kontrol edilirken hata oluştu:', blockError);
      }
      
      // Karşı tarafın kullanıcıyı engelleyip engellemediğini kontrol et
      const { data: blockedByOther, error: otherBlockError } = await supabase
        .from('user_blocks')
        .select('*')
        .eq('blocker_id', targetUserId)
        .eq('blocked_user_id', currentUserId)
        .maybeSingle();
      
      if (otherBlockError) {
        console.error('Karşı tarafın engelleme durumu kontrol edilirken hata oluştu:', otherBlockError);
      }
      
      // Engelleme durumlarını ayarla
      setIsBlocked(!!blockedByUser);
      setIsBlockedBy(!!blockedByOther);
      
      // Eğer kullanıcı engellenmiş ise, profil görüntülenemez
      if (blockedByOther) {
        Alert.alert('Erişim Engellendi', 'Bu kullanıcı tarafından engellendiniz.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Engelleme durumu kontrol edilirken hata oluştu:', error);
    }
  };
  
  // Eşleşme durumunu kontrol et
  const checkMatchStatus = async (targetUserId: string) => {
    if (!currentUser) return;
    
    try {
      // Kullanıcının karşı tarafa beğeni gönderip göndermediğini kontrol et
      const { data: likeData, error: likeError } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('target_user_id', targetUserId)
        .eq('interaction_type', 'like')
        .maybeSingle();
      
      if (likeError) {
        console.error('Beğeni durumu kontrol edilirken hata oluştu:', likeError);
      }
      
      // Karşı tarafın kullanıcıyı beğenip beğenmediğini kontrol et
      const { data: matchData, error: matchError } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('target_user_id', currentUser.id)
        .eq('interaction_type', 'like')
        .maybeSingle();
      
      if (matchError) {
        console.error('Eşleşme durumu kontrol edilirken hata oluştu:', matchError);
      }
      
      // Eşleşme durumunu belirle
      if (likeData && matchData) {
        setMatchStatus('matched');
      } else if (likeData) {
        setMatchStatus('liked');
      } else {
        setMatchStatus('none');
      }
    } catch (error) {
      console.error('Eşleşme durumu kontrol edilirken hata oluştu:', error);
    }
  };
  
  // Yaş hesaplama
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };
  
  // Geri düğmesi
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Kullanıcıyı beğen
  const handleLikeUser = async () => {
    if (!currentUser || !user) return;
    
    // Engelleme durumunda beğeni işlemi yapılamaz
    if (isBlocked || isBlockedBy) {
      Alert.alert('İşlem Yapılamıyor', 'Engellenen kullanıcılarla etkileşim kuramazsınız.');
      return;
    }
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Önceden beğeni var mı kontrol et
      const { data: existingLike, error: checkError } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('target_user_id', user.id)
        .eq('interaction_type', 'like')
        .maybeSingle();
      
      if (checkError) {
        console.error('Beğeni kontrolünde hata:', checkError);
        return;
      }
      
      if (existingLike) {
        // Beğeniyi kaldır
        const { error: deleteError } = await supabase
          .from('user_interactions')
          .delete()
          .eq('id', existingLike.id);
        
        if (deleteError) {
          console.error('Beğeni kaldırılırken hata oluştu:', deleteError);
          return;
        }
        
        setMatchStatus('none');
        Alert.alert('Beğeni Kaldırıldı', `${user.first_name} adlı kullanıcıyı beğenmekten vazgeçtiniz.`);
      } else {
        // Yeni beğeni ekle
        const { error: insertError } = await supabase
          .from('user_interactions')
          .insert({
            user_id: currentUser.id,
            target_user_id: user.id,
            interaction_type: 'like'
          });
        
        if (insertError) {
          console.error('Beğeni eklenirken hata oluştu:', insertError);
          return;
        }
        
        // Karşılıklı beğeni durumunu kontrol et
        const { data: otherLike, error: otherLikeError } = await supabase
          .from('user_interactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('target_user_id', currentUser.id)
          .eq('interaction_type', 'like')
          .maybeSingle();
        
        if (otherLikeError) {
          console.error('Karşı beğeni kontrolünde hata:', otherLikeError);
        }
        
        if (otherLike) {
          setMatchStatus('matched');
          Alert.alert('Eşleşme!', `${user.first_name} ile eşleştiniz! Şimdi mesajlaşabilirsiniz.`);
        } else {
          setMatchStatus('liked');
          Alert.alert('Beğenildi', `${user.first_name} adlı kullanıcıyı beğendiniz.`);
        }
      }
    } catch (error) {
      console.error('Beğeni işlemi sırasında hata oluştu:', error);
    }
  };
  
  // Mesaj gönder
  const handleSendMessage = () => {
    // Engelleme durumunda mesaj gönderme işlemi yapılamaz
    if (isBlocked || isBlockedBy) {
      Alert.alert('İşlem Yapılamıyor', 'Engellenen kullanıcılarla mesajlaşamazsınız.');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Mesaj ekranına yönlendir
    navigation.navigate('ChatDetail' as never, { userId: user.id } as never);
  };
  
  // Kullanıcıyı bildir
  const handleReportUser = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log('Raporla: ' + user.id);
    
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Kullanıcıyı Bildir',
        'Bu kullanıcıyı neden bildirmek istiyorsunuz?',
        [
          {
            text: 'İptal',
            style: 'cancel',
          },
          {
            text: 'Sahte Profil',
            onPress: () => handleReport('fake_profile'),
          },
          {
            text: 'Uygunsuz İçerik',
            onPress: () => handleReport('inappropriate_content'),
          },
          {
            text: 'Taciz',
            onPress: () => handleReport('harassment'),
          },
          {
            text: 'Spam',
            onPress: () => handleReport('spam'),
          },
          {
            text: 'Rahatsız Edici Davranış',
            onPress: () => handleReport('disturbing_behavior'),
          },
          {
            text: 'Diğer',
            onPress: () => {
              // Diğer sebep için metin girmesini iste
              Alert.prompt(
                'Diğer Sebep',
                'Lütfen bildirim sebebinizi kısaca açıklayın:',
                [
                  {
                    text: 'İptal',
                    style: 'cancel',
                  },
                  {
                    text: 'Bildir',
                    onPress: (reason) => reason ? handleReport('other', reason) : null
                  }
                ],
                'plain-text'
              );
            },
          },
        ],
      );
    } else {
      // Android için özel dialog
      Alert.alert(
        'Kullanıcıyı Bildir',
        'Bu kullanıcıyı neden bildirmek istiyorsunuz?',
        [
          {
            text: 'İptal',
            style: 'cancel',
          },
          {
            text: 'Sahte Profil',
            onPress: () => handleReport('fake_profile'),
          },
          {
            text: 'Uygunsuz İçerik',
            onPress: () => handleReport('inappropriate_content'),
          },
          {
            text: 'Taciz',
            onPress: () => handleReport('harassment'),
          },
          {
            text: 'Spam',
            onPress: () => handleReport('spam'),
          },
          {
            text: 'Rahatsız Edici Davranış',
            onPress: () => handleReport('disturbing_behavior'),
          },
          {
            text: 'Diğer',
            onPress: () => {
              setReportReason('other');
              setShowReportDialog(true);
            },
          },
        ],
      );
    }
  };
  
  // Bildirimi gönder
  const handleReport = async (reason: string, details?: string) => {
    if (!currentUser || !user) return;
    
    try {
      // Bildirimi veritabanına kaydet
      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: currentUser.id,
          reported_user_id: user.id,
          reason: reason,
          details: details || null,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Bildirim gönderilirken hata oluştu:', error);
        
        // Tablo yoksa oluştur
        if (error.code === '42P01') { // ilişki yok hatası
          console.log('user_reports tablosu bulunamadı, oluşturuluyor...');
          
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS public.user_reports (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
              reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
              reason TEXT NOT NULL,
              details TEXT,
              status TEXT NOT NULL DEFAULT 'pending',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
              admin_notes TEXT,
              resolved_at TIMESTAMP WITH TIME ZONE
            );
            
            CREATE INDEX user_reports_reporter_id_idx ON public.user_reports (reporter_id);
            CREATE INDEX user_reports_reported_user_id_idx ON public.user_reports (reported_user_id);
            CREATE INDEX user_reports_status_idx ON public.user_reports (status);
            
            -- RLS politikaları
            ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
            
            -- Kullanıcılar kendi raporlarını görebilir
            CREATE POLICY "Kullanıcılar kendi raporlarını görebilir" 
            ON public.user_reports FOR SELECT 
            USING (auth.uid() = reporter_id);
            
            -- Kullanıcılar rapor oluşturabilir
            CREATE POLICY "Kullanıcılar rapor oluşturabilir" 
            ON public.user_reports FOR INSERT 
            WITH CHECK (auth.uid() = reporter_id);
            
            -- Trigger için güncelleme zamanı fonksiyonu
            CREATE OR REPLACE FUNCTION update_user_reports_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = now();
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Güncelleme zamanı trigger'ı
            CREATE TRIGGER update_user_reports_updated_at
            BEFORE UPDATE ON public.user_reports
            FOR EACH ROW
            EXECUTE FUNCTION update_user_reports_updated_at();
          `;
          
          const { error: createTableError } = await supabase.rpc('exec', { query: createTableQuery });
          
          if (createTableError) {
            console.error('Tablo oluşturulurken hata:', createTableError);
            Alert.alert('Hata', 'Bildiriminiz gönderilemedi. Lütfen daha sonra tekrar deneyin.');
            return;
          }
          
          // Tablo oluşturulduktan sonra tekrar dene
          const { error: retryError } = await supabase
            .from('user_reports')
            .insert({
              reporter_id: currentUser.id,
              reported_user_id: user.id,
              reason: reason,
              details: details || null,
              status: 'pending',
              created_at: new Date().toISOString()
            });
            
          if (retryError) {
            console.error('İkinci denemede bildirim gönderilirken hata:', retryError);
            Alert.alert('Hata', 'Bildiriminiz gönderilemedi. Lütfen daha sonra tekrar deneyin.');
            return;
          }
        } else {
          Alert.alert('Hata', 'Bildiriminiz gönderilemedi. Lütfen daha sonra tekrar deneyin.');
          return;
        }
      }
      
      Alert.alert('Teşekkürler', 'Bildiriminiz alındı. Ekibimiz inceleme yapacaktır.');
    } catch (error) {
      console.error('Bildirim işlemi sırasında hata oluştu:', error);
      Alert.alert('Hata', 'Bildiriminiz gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }
  };
  
  // Kullanıcıyı engelle
  const handleBlockUser = async () => {
    if (!currentUser || !user) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Eğer zaten engellenmiş ise, engeli kaldırma seçeneği sunalım
      if (isBlocked) {
        Alert.alert(
          'Engeli Kaldır',
          `${user.first_name} adlı kullanıcı için engeli kaldırmak istiyor musunuz?`,
          [
            {
              text: 'İptal',
              style: 'cancel',
            },
            {
              text: 'Engeli Kaldır',
              style: 'default',
              onPress: async () => {
                // Engellemeyi veritabanından kaldır
                const { data: blockData, error: fetchError } = await supabase
                  .from('user_blocks')
                  .select('id')
                  .eq('blocker_id', currentUser.id)
                  .eq('blocked_user_id', user.id)
                  .maybeSingle();
                
                if (fetchError) {
                  console.error('Engelleme kaydı bulunurken hata oluştu:', fetchError);
                  Alert.alert('Hata', 'Engel kaldırılamadı. Lütfen daha sonra tekrar deneyin.');
                  return;
                }
                
                if (blockData) {
                  const { error: deleteError } = await supabase
                    .from('user_blocks')
                    .delete()
                    .eq('id', blockData.id);
                  
                  if (deleteError) {
                    console.error('Engel kaldırılırken hata oluştu:', deleteError);
                    Alert.alert('Hata', 'Engel kaldırılamadı. Lütfen daha sonra tekrar deneyin.');
                    return;
                  }
                  
                  setIsBlocked(false);
                  Alert.alert('Engel Kaldırıldı', `${user.first_name} adlı kullanıcı için engel kaldırıldı.`);
                }
              },
            },
          ],
        );
      } else {
        // Yeni engelleme işlemi yap
        Alert.alert(
          'Kullanıcıyı Engelle',
          `${user.first_name} adlı kullanıcıyı engellemek istediğinize emin misiniz? Engellenen kullanıcılar sizinle iletişim kuramaz.`,
          [
            {
              text: 'İptal',
              style: 'cancel',
            },
            {
              text: 'Engelle',
              style: 'destructive',
              onPress: async () => {
                // Kullanıcıyı engelle
                const { error } = await supabase
                  .from('user_blocks')
                  .insert({
                    blocker_id: currentUser.id,
                    blocked_user_id: user.id
                  });
                
                if (error) {
                  console.error('Kullanıcı engellenirken hata oluştu:', error);
                  Alert.alert('Hata', 'Kullanıcı engellenemedi. Lütfen daha sonra tekrar deneyin.');
                  return;
                }
                
                // Kullanıcı etkileşimlerini de silmek ister mi sor
                Alert.alert(
                  'Etkileşimleri Sil',
                  `${user.first_name} adlı kullanıcıyla olan tüm etkileşimleri silmek ister misiniz? Bu işlem, kullanıcı engelini kaldırdığınızda bu kişiyi Keşfet'te tekrar görmenizi sağlar.`,
                  [
                    {
                      text: 'Hayır',
                      style: 'cancel',
                      onPress: () => {
                        setIsBlocked(true);
                        Alert.alert('Engellendi', `${user.first_name} adlı kullanıcı engellendi.`);
                        navigation.goBack();
                      }
                    },
                    {
                      text: 'Evet, Sil',
                      onPress: async () => {
                        // Tüm etkileşimleri sil
                        const { error: deleteError } = await supabase
                          .from('user_interactions')
                          .delete()
                          .eq('user_id', currentUser.id)
                          .eq('target_user_id', user.id);
                        
                        if (deleteError) {
                          console.error('Etkileşimler silinirken hata oluştu:', deleteError);
                          Alert.alert('Uyarı', 'Etkileşim kayıtları silinemedi, kullanıcı engellendi ancak engel kaldırıldığında hemen Keşfet\'te görünmeyebilir.');
                        } else {
                          Alert.alert('Engellendi', `${user.first_name} adlı kullanıcı engellendi ve tüm etkileşimler silindi.`);
                        }
                        
                        setIsBlocked(true);
                        navigation.goBack();
                      }
                    }
                  ]
                );
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error('Engelleme işlemi sırasında hata oluştu:', error);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.dark.primary} />
      </View>
    );
  }
  
  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="account-alert" size={64} color={COLORS.dark.error} />
        <ElementsText style={styles.errorText}>Kullanıcı bulunamadı</ElementsText>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ElementsText style={styles.backButtonText}>Geri Dön</ElementsText>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Yaş hesapla
  const userAge = user.birth_date ? calculateAge(user.birth_date) : null;
  
  // Kullanıcı gizlilik ayarlarına göre görünüm kontrolü
  const isProfileVisible = (currentUser?.id === user.id || 
    !user.privacy_settings || 
    user.privacy_settings.profile_visibility === 'everyone' || 
    (user.privacy_settings.profile_visibility === 'matches' && matchStatus === 'matched')) &&
    !isBlocked && !isBlockedBy; // Engelleme durumunda profil görünmez
  
  // Konum bilgisi - gizlilik ayarına göre
  const showLocation = currentUser?.id === user.id || !user.privacy_settings || 
    user.privacy_settings.location_sharing || 
    (user.privacy_settings.profile_visibility === 'matches' && matchStatus === 'matched');
  
  // Tüm fotoğraf paylaşımı - gizlilik ayarına göre
  const showAllPhotos = currentUser?.id === user.id || !user.privacy_settings || 
    user.privacy_settings.photo_sharing || 
    (user.privacy_settings.profile_visibility === 'matches' && matchStatus === 'matched');
  
  // Görüntülenecek fotoğraflar
  const visiblePhotos = showAllPhotos 
    ? user.photos || [] 
    : user.photos && user.photos.length > 0 ? [user.photos[0]] : [];
  
  // Profil fotoğrafı
  const profileImage = user.profile_photo || 
    (user.photos && user.photos.length > 0 ? user.photos[0] : 'https://i.pravatar.cc/300');
  
  if (!isProfileVisible) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1A1A1A', '#121212']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={[styles.header, { paddingTop: insets.top > 0 ? 10 : 10 }]}>
              <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.dark.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.privateProfileContainer}>
              <MaterialCommunityIcons name="lock" size={64} color={COLORS.dark.textSecondary} />
              <ElementsText style={styles.privateProfileText}>Bu profil gizlidir</ElementsText>
              <ElementsText style={styles.privateProfileDescription}>
                Bu kullanıcı profilini sadece eşleştiği kişilere gösteriyor
              </ElementsText>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A1A', '#121212']}
        style={styles.gradient}
      >
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { paddingTop: insets.top > 0 ? 10 : 10 }]}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.dark.text} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setShowActions(!showActions)} 
              style={styles.menuButton}
            >
              <MaterialCommunityIcons name="dots-vertical" size={24} color={COLORS.dark.text} />
            </TouchableOpacity>
            
            {showActions && (
              <View style={styles.actionsMenu}>
                <TouchableOpacity style={styles.actionItem} onPress={handleReportUser}>
                  <MaterialCommunityIcons name="flag" size={20} color={COLORS.dark.warning} />
                  <ElementsText style={styles.actionText}>Bildir</ElementsText>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionItem} onPress={handleBlockUser}>
                  <MaterialCommunityIcons 
                    name={isBlocked ? "lock-open-outline" : "block-helper"} 
                    size={20} 
                    color={isBlocked ? COLORS.dark.warning : COLORS.dark.error} 
                  />
                  <ElementsText style={styles.actionText}>
                    {isBlocked ? 'Engeli Kaldır' : 'Engelle'}
                  </ElementsText>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Profil Başlık Kısmı */}
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
                <Image
                  source={{ uri: profileImage }}
                  style={styles.profileImage}
                />
                {matchStatus === 'matched' && (
                  <View style={styles.matchBadge}>
                    <MaterialCommunityIcons name="check-decagram" size={24} color="#4CAF50" />
                  </View>
                )}
              </View>

              <ElementsText style={styles.name}>
                {user.first_name} {user.last_name}{userAge ? `, ${userAge}` : ''}
              </ElementsText>
              
              {showLocation && user.location && (user.location.city || user.location.country) ? (
                <View style={styles.locationContainer}>
                  <MaterialCommunityIcons name="map-marker" size={16} color={COLORS.dark.textSecondary} />
                  <ElementsText style={styles.location}>
                    {user.location.city && user.location.country
                      ? `${user.location.city}, ${user.location.country}`
                      : user.location.city || user.location.country}
                  </ElementsText>
                </View>
              ) : (
                <View style={styles.locationContainer}>
                  <MaterialCommunityIcons name="map-marker-off" size={16} color={COLORS.dark.textSecondary} />
                  <ElementsText style={styles.location}>Konum Gizli</ElementsText>
                </View>
              )}

              {/* Etkileşim Butonları */}
              <View style={styles.actionButtons}>
                {/* Beğen Butonu */}
                <TouchableOpacity 
                  style={[
                    styles.actionButton,
                    matchStatus !== 'none' && styles.actionButtonActive
                  ]}
                  onPress={handleLikeUser}
                  disabled={isBlocked || isBlockedBy} // Engelleme durumunda beğeni butonu devre dışı
                >
                  <MaterialCommunityIcons 
                    name={matchStatus !== 'none' ? "heart" : "heart-outline"} 
                    size={28} 
                    color={matchStatus !== 'none' ? COLORS.dark.error : COLORS.dark.text} 
                  />
                </TouchableOpacity>
                
                {/* Mesaj Butonu */}
                <TouchableOpacity 
                  style={[
                    styles.actionButton,
                    styles.messageButton,
                    matchStatus === 'matched' && styles.messageButtonActive
                  ]}
                  onPress={handleSendMessage}
                  disabled={matchStatus !== 'matched' || isBlocked || isBlockedBy} // Engelleme durumunda mesaj butonu devre dışı
                >
                  <MaterialCommunityIcons 
                    name="message" 
                    size={28} 
                    color={matchStatus === 'matched' ? '#FFFFFF' : COLORS.dark.textSecondary} 
                  />
                  <ElementsText style={[
                    styles.messageButtonText,
                    matchStatus === 'matched' ? styles.messageButtonTextActive : {}
                  ]}>
                    {matchStatus === 'matched' ? 'Mesaj Gönder' : 'Mesaj'}
                  </ElementsText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Biyografi bölümü */}
            {user.biography && (
              <View style={styles.bioSection}>
                <ElementsText style={styles.sectionTitle}>Hakkında</ElementsText>
                <LinearGradient
                  colors={['#2D2D2D', '#252525']}
                  style={styles.bioCard}
                >
                  <ElementsText style={styles.bioText}>{user.biography}</ElementsText>
                </LinearGradient>
              </View>
            )}

            {/* Fotoğraflar */}
            {visiblePhotos.length > 0 && (
              <View style={styles.photosSection}>
                <ElementsText style={styles.sectionTitle}>Fotoğraflar</ElementsText>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photosContainer}
                >
                  {visiblePhotos.map((photo, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={styles.photoItem}
                    >
                      <Image source={{ uri: photo }} style={styles.photo} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {!showAllPhotos && user.photos && user.photos.length > 1 && (
                  <View style={styles.photoRestrictionContainer}>
                    <MaterialCommunityIcons name="lock" size={16} color={COLORS.dark.textSecondary} />
                    <ElementsText style={styles.photoRestrictionText}>
                      Diğer fotoğraflar gizli
                    </ElementsText>
                  </View>
                )}
              </View>
            )}

            {/* İlgi Alanları */}
            {user.hobbies && user.hobbies.length > 0 && (
              <View style={styles.hobbySection}>
                <ElementsText style={styles.sectionTitle}>İlgi Alanları</ElementsText>
                <View style={styles.hobbyContainer}>
                  {user.hobbies.map((hobby, index) => (
                    <LinearGradient
                      key={index}
                      colors={['#3D3D3D', '#333333']}
                      style={styles.hobbyChip}
                    >
                      <ElementsText style={styles.hobbyText}>{hobby}</ElementsText>
                    </LinearGradient>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
      
      {/* Android için özel rapor dialog modalı */}
      <Modal
        visible={showReportDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReportDialog(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.reportModalContainer}>
            <View style={styles.reportModalHeader}>
              <ElementsText style={styles.reportModalTitle}>Bildirim Detayları</ElementsText>
              <TouchableOpacity onPress={() => setShowReportDialog(false)}>
                <MaterialCommunityIcons name="close" size={24} color={COLORS.dark.text} />
              </TouchableOpacity>
            </View>
            
            <ElementsText style={styles.reportModalLabel}>
              Lütfen bildirim sebebinizi kısaca açıklayın:
            </ElementsText>
            
            <TextInput
              style={styles.reportModalInput}
              multiline
              placeholder="Açıklama yazın..."
              placeholderTextColor="#999"
              value={reportDetails}
              onChangeText={setReportDetails}
              maxLength={500}
            />
            
            <View style={styles.reportModalButtonRow}>
              <TouchableOpacity 
                style={[styles.reportModalButton, styles.reportModalCancelButton]}
                onPress={() => setShowReportDialog(false)}
              >
                <ElementsText style={styles.reportModalButtonText}>İptal</ElementsText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.reportModalButton, 
                  styles.reportModalSubmitButton,
                  !reportDetails.trim() && styles.reportModalButtonDisabled
                ]}
                onPress={() => {
                  if (reportDetails.trim()) {
                    setShowReportDialog(false);
                    handleReport(reportReason, reportDetails);
                    setReportDetails('');
                  }
                }}
                disabled={!reportDetails.trim()}
              >
                <ElementsText style={styles.reportModalButtonText}>Bildir</ElementsText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.dark.text,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButtonText: {
    color: COLORS.dark.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    zIndex: 10,
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.circular,
  },
  menuButton: {
    padding: SPACING.xs,
    borderRadius: BORDER_RADIUS.circular,
  },
  actionsMenu: {
    position: 'absolute',
    right: SPACING.md,
    top: SPACING.xl,
    backgroundColor: '#333',
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.medium,
    zIndex: 20,
    padding: SPACING.sm,
    width: 120,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  actionText: {
    marginLeft: SPACING.xs,
    color: COLORS.dark.text,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: BORDER_RADIUS.circular,
    borderWidth: 3,
    borderColor: COLORS.dark.primary,
    ...SHADOWS.medium,
  },
  matchBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderRadius: BORDER_RADIUS.circular,
    padding: 2,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark.text,
    marginBottom: SPACING.xs,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  location: {
    fontSize: 16,
    color: COLORS.dark.textSecondary,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.circular,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    ...SHADOWS.small,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  messageButton: {
    width: 160,
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    backgroundColor: '#333',
    marginLeft: SPACING.md,
  },
  messageButtonActive: {
    backgroundColor: COLORS.dark.primary,
  },
  messageButtonText: {
    color: COLORS.dark.textSecondary,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  messageButtonTextActive: {
    color: '#FFFFFF',
  },
  bioSection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.sm,
  },
  bioCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.dark.text,
  },
  photosSection: {
    marginBottom: SPACING.lg,
  },
  photosContainer: {
    paddingHorizontal: SPACING.md,
  },
  photoItem: {
    width: 150,
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRestrictionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  photoRestrictionText: {
    color: COLORS.dark.textSecondary,
    fontSize: 12,
    marginLeft: 4,
  },
  hobbySection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  hobbyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hobbyChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  hobbyText: {
    color: COLORS.dark.text,
    fontSize: 13,
  },
  privateProfileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  privateProfileText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  privateProfileDescription: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportModalContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
  },
  reportModalLabel: {
    color: COLORS.dark.textSecondary,
    marginBottom: 10,
  },
  reportModalInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    color: COLORS.dark.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  reportModalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportModalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  reportModalCancelButton: {
    backgroundColor: '#444',
  },
  reportModalSubmitButton: {
    backgroundColor: COLORS.dark.primary,
  },
  reportModalButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.7,
  },
  reportModalButtonText: {
    color: COLORS.dark.text,
    fontWeight: '600',
  },
}); 