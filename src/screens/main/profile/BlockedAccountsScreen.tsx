import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { ElementsText } from '../../../components/common/wrappers';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '../../../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../../lib/supabase';

// Engellenen kullanıcı tipi
interface BlockedUser {
  id: string;
  block_id: string;
  first_name: string;
  last_name: string;
  profile_photo: string | null;
}

export function BlockedAccountsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user: currentUser } = useUser();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  // Engellenen kullanıcıları yükle
  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  // Engellenen kullanıcıları getir
  const fetchBlockedUsers = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);

      // user_blocks tablosundan engellediğim kullanıcıları getir ve kullanıcı bilgilerini birleştir
      const { data, error } = await supabase
        .from('user_blocks')
        .select(`
          id,
          blocked_user_id,
          users!user_blocks_blocked_user_id_fkey(
            id, 
            first_name, 
            last_name, 
            profile_photo
          )
        `)
        .eq('blocker_id', currentUser.id);

      if (error) {
        console.error('Engellenen kullanıcılar alınamadı:', error);
        Alert.alert('Hata', 'Engellenen kullanıcılar listelenirken bir sorun oluştu.');
        return;
      }

      // Verileri düzenle
      if (data) {
        const formattedData: BlockedUser[] = data.map(item => ({
          id: item.blocked_user_id,
          block_id: item.id,
          first_name: item.users.first_name,
          last_name: item.users.last_name,
          profile_photo: item.users.profile_photo
        }));
        
        setBlockedUsers(formattedData);
      }

    } catch (error) {
      console.error('Engellenen kullanıcılar yüklenirken hata oluştu:', error);
      Alert.alert('Hata', 'Engellenen kullanıcılar listelenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Engeli kaldır
  const handleUnblockUser = async (blockedUser: BlockedUser) => {
    if (!currentUser?.id) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // İşlenen kullanıcıları izle
      setProcessingIds(prev => [...prev, blockedUser.id]);

      // Onay iste
      Alert.alert(
        'Engeli Kaldır',
        `${blockedUser.first_name} ${blockedUser.last_name} kullanıcısının engelini kaldırmak istediğinize emin misiniz?`,
        [
          {
            text: 'İptal',
            style: 'cancel',
            onPress: () => setProcessingIds(prev => prev.filter(id => id !== blockedUser.id))
          },
          {
            text: 'Engeli Kaldır',
            style: 'destructive',
            onPress: async () => {
              try {
                // Engellemeyi veritabanından kaldır
                const { error } = await supabase
                  .from('user_blocks')
                  .delete()
                  .eq('id', blockedUser.block_id);

                if (error) {
                  console.error('Engel kaldırılırken hata oluştu:', error);
                  Alert.alert('Hata', 'Engel kaldırılırken bir sorun oluştu.');
                  return;
                }
                
                // Kullanıcı etkileşimlerini kontrol et ve gerekirse sil
                // Eğer kullanıcı daha önce engellenmiş kullanıcıyı beğenmemiş/reddetmemişse,
                // bu kullanıcı Keşfet'te görünecektir
                const { data: existingInteraction, error: interactionError } = await supabase
                  .from('user_interactions')
                  .select('id')
                  .eq('user_id', currentUser.id)
                  .eq('target_user_id', blockedUser.id)
                  .maybeSingle();
                
                if (interactionError) {
                  console.error('Kullanıcı etkileşimleri kontrol edilirken hata:', interactionError);
                }
                
                // Eğer bir etkileşim varsa ve kullanıcı keşfet sayfasında görmek istiyorsa
                // bu etkileşimi silmek isteyip istemediğini sor
                if (existingInteraction) {
                  Alert.alert(
                    'Etkileşim Bulundu',
                    `${blockedUser.first_name} ${blockedUser.last_name} ile daha önce etkileşimde bulunmuşsunuz. Bu kullanıcıyı Keşfet'te tekrar görmek istiyor musunuz?`,
                    [
                      { text: 'Hayır', style: 'cancel' },
                      {
                        text: 'Evet',
                        onPress: async () => {
                          // Etkileşimi sil
                          const { error: deleteError } = await supabase
                            .from('user_interactions')
                            .delete()
                            .eq('id', existingInteraction.id);
                          
                          if (deleteError) {
                            console.error('Etkileşim silinirken hata:', deleteError);
                            Alert.alert('Uyarı', 'Etkileşim kaydı silinemedi, kullanıcı Keşfet\'te hemen görünmeyebilir.');
                          } else {
                            Alert.alert('Başarılı', `${blockedUser.first_name} ${blockedUser.last_name} artık Keşfet'te görünecek.`);
                          }
                        }
                      }
                    ]
                  );
                } else {
                  // Etkileşim yoksa, kullanıcı zaten Keşfet'te görünecektir
                  Alert.alert('Başarılı', `${blockedUser.first_name} ${blockedUser.last_name} kullanıcısının engeli kaldırıldı ve Keşfet'te görünecek.`);
                }
                
                // Listeyi güncelle
                setBlockedUsers(prev => prev.filter(user => user.id !== blockedUser.id));
              } catch (error) {
                console.error('Engel kaldırılırken hata oluştu:', error);
                Alert.alert('Hata', 'Engel kaldırılırken bir sorun oluştu.');
              } finally {
                setProcessingIds(prev => prev.filter(id => id !== blockedUser.id));
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Engel kaldırılırken hata oluştu:', error);
      setProcessingIds(prev => prev.filter(id => id !== blockedUser.id));
    }
  };

  // Geri dön
  const handleGoBack = () => {
    navigation.goBack();
  };

  // Boş liste gösterimi
  const renderEmptyList = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="shield-check" size={64} color={COLORS.dark.textSecondary} />
        <ElementsText style={styles.emptyTitle}>Engellenen Hesap Yok</ElementsText>
        <ElementsText style={styles.emptyText}>
          Hiçbir kullanıcıyı engellemediğiniz için bu liste boş. Bir kullanıcıyı engellemek için profilinde "Engelle" seçeneğini kullanabilirsiniz.
        </ElementsText>
      </View>
    );
  };

  // Her bir engellenen kullanıcı listesi öğesi
  const renderItem = ({ item }: { item: BlockedUser }) => {
    const isProcessing = processingIds.includes(item.id);
    
    return (
      <View style={styles.userItem}>
        <View style={styles.userInfo}>
          <Image 
            source={{ uri: item.profile_photo || 'https://i.pravatar.cc/150' }} 
            style={styles.userAvatar} 
          />
          <View style={styles.userTextContainer}>
            <ElementsText style={styles.userName}>{item.first_name} {item.last_name}</ElementsText>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.unblockButton}
          onPress={() => handleUnblockUser(item)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={COLORS.dark.error} />
          ) : (
            <ElementsText style={styles.unblockButtonText}>Engeli Kaldır</ElementsText>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#1A1A1A', '#121212']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 10 : 10 }]}>
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
            <ElementsText style={styles.headerTitle}>Engellenen Hesaplar</ElementsText>
            <View style={styles.placeholderView} />
          </View>
        </View>

        {/* İçerik */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.dark.primary} />
          </View>
        ) : (
          <FlatList
            data={blockedUsers}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyList}
          />
        )}
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
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderView: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
  },
  userTextContainer: {
    marginLeft: SPACING.md,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark.text,
  },
  unblockButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  unblockButtonText: {
    fontSize: 14,
    color: COLORS.dark.error,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
}); 