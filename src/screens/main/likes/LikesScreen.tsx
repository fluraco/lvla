import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Text } from 'react-native-elements';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../../../theme';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, AntDesign, Ionicons } from '@expo/vector-icons';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useChatRooms } from '../../../hooks/useChatRooms';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 100;

type LikeUser = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  photos?: string[];
  profile_image_url?: string;
  interaction_id: string;
  created_at: string;
  location?: {
    city: string;
    country: string;
  };
};

export function LikesScreen() {
  const insets = useSafeAreaInsets();
  const [likes, setLikes] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const navigation = useNavigation();
  const { createRoom } = useChatRooms();
  const [isPremium, setIsPremium] = useState(false);
  const [randomLikeCount, setRandomLikeCount] = useState(0);

  useEffect(() => {
    checkUserPremium();
  }, [user]);

  useEffect(() => {
    fetchLikes();
    generateRandomLikeCount();
  }, [isPremium]);

  // Premium durumunu kontrol et
  const checkUserPremium = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_premium')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Premium durumu kontrol edilirken hata:', error);
        return;
      }
      
      setIsPremium(data?.is_premium || false);
      
    } catch (error) {
      console.error('Premium durumu kontrol edilirken beklenmeyen hata:', error);
    }
  };

  // Random bir beğeni sayısı oluştur (4-15 arası)
  const generateRandomLikeCount = () => {
    const randomCount = Math.floor(Math.random() * 12) + 4; // 4 ile 15 arası
    setRandomLikeCount(randomCount);
  };

  const fetchLikes = async () => {
    if (!user || !user.id) return;

    try {
      setLoading(true);
      
      // Premium değilse, boş dizi döndür (tüm beğenileri görmek premium özelliği)
      if (!isPremium) {
        setLikes([]);
        setLoading(false);
        return;
      }
      
      // user_interactions tablosundan beğenileri getir
      const { data: likesData, error: likesError } = await supabase
        .from('user_interactions')
        .select(`
          id,
          user_id,
          target_user_id,
          interaction_type,
          created_at
        `)
        .eq('target_user_id', user.id)
        .eq('interaction_type', 'like')
        .order('created_at', { ascending: false });
      
      if (likesError) {
        console.error('Beğeniler getirilirken hata oluştu:', likesError);
        Alert.alert('Hata', 'Beğeniler getirilirken hata oluştu');
        return;
      }
      
      if (!likesData || likesData.length === 0) {
        setLikes([]);
        setLoading(false);
        return;
      }
      
      // Kullanıcı bilgilerini getir
      const userIds = likesData.map(like => like.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          birth_date,
          photos,
          profile_image_url,
          location
        `)
        .in('id', userIds);
      
      if (usersError) {
        console.error('Kullanıcı bilgileri getirilirken hata oluştu:', usersError);
        Alert.alert('Hata', 'Kullanıcı bilgileri getirilirken hata oluştu');
        return;
      }
      
      // Verileri birleştir
      const likeUsers = likesData.map(like => {
        const userInfo = usersData.find(user => user.id === like.user_id);
        return {
          ...userInfo,
          interaction_id: like.id,
          created_at: like.created_at
        };
      });
      
      setLikes(likeUsers);
    } catch (error) {
      console.error('Beğeniler yüklenirken bir hata oluştu:', error);
      Alert.alert('Hata', 'Beğeniler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleViewProfile = (userId: string, userName: string, userPhoto: string) => {
    navigation.navigate('UserProfile', {
      userId,
      userName,
      userAvatar: userPhoto,
    });
  };

  const handleStartChat = async (userId: string, userName: string, userPhoto: string) => {
    if (!user) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Sohbet odasını oluştur veya var olan odayı getir
      const roomId = await createRoom(user.id, userId);
      
      if (roomId) {
        // Sohbet detay sayfasına yönlendir
        navigation.navigate('ChatDetail', {
          conversationId: roomId,
          userName: userName,
          userAvatar: userPhoto,
        });
      }
    } catch (error) {
      console.error('Sohbet başlatılırken hata oluştu:', error);
    }
  };

  const handleRejectLike = async (interactionId: string, userName: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      Alert.alert(
        "Beğeniyi Reddet",
        `${userName} kullanıcısının beğenisini reddetmek istediğinize emin misiniz?`,
        [
          {
            text: "Vazgeç",
            style: "cancel"
          },
          {
            text: "Reddet",
            style: "destructive",
            onPress: async () => {
              // Beğeniyi sil
              const { error } = await supabase
                .from('user_interactions')
                .delete()
                .eq('id', interactionId);
              
              if (error) {
                console.error('Beğeni reddedilirken hata oluştu:', error);
                Alert.alert('Hata', 'Beğeni reddedilirken hata oluştu');
                return;
              }
              
              // Başarılı olursa listeyi güncelle
              setLikes(prevLikes => prevLikes.filter(like => like.interaction_id !== interactionId));
            }
          }
        ]
      );
    } catch (error) {
      console.error('Beğeni reddedilirken bir hata oluştu:', error);
      Alert.alert('Hata', 'Beğeni reddedilirken bir hata oluştu');
    }
  };

  // Premium satın alma sayfasına yönlendir
  const navigateToPremium = () => {
    navigation.navigate('PremiumScreen' as never);
  };

  const renderLikeItem = ({ item }: { item: LikeUser }) => {
    const userPhoto = (item.photos && item.photos.length > 0) 
      ? item.photos[0] 
      : (item.profile_image_url || 'https://via.placeholder.com/150');
    
    return (
      <View style={styles.likeItemContainer}>
        <TouchableOpacity 
          style={styles.likeItemPhotoContainer}
          onPress={() => handleViewProfile(item.id, item.first_name, userPhoto)}
        >
          <Image 
            source={{ uri: userPhoto }} 
            style={styles.likeItemPhoto} 
            resizeMode="cover"
          />
          
          {item.interaction_type === 'superlike' && (
            <View style={styles.superLikeBadge}>
              <MaterialCommunityIcons
                name="star"
                size={14}
                color={COLORS.light.warning}
              />
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.likeItemInfoContainer}>
          <TouchableOpacity 
            style={styles.likeItemHeader}
            onPress={() => handleViewProfile(item.id, item.first_name, userPhoto)}
          >
            <Text style={styles.likeItemName}>
              {item.first_name}, {calculateAge(item.birth_date)}
            </Text>
            
            {item.location?.city && (
              <View style={styles.likeItemLocation}>
                <MaterialCommunityIcons 
                  name="map-marker" 
                  size={12} 
                  color={COLORS.dark.textSecondary} 
                />
                <Text style={styles.likeItemLocationText}>
                  {item.location.city}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.likeItemActions}>
            <TouchableOpacity 
              style={styles.likeItemAction}
              onPress={() => handleRejectLike(item.interaction_id, item.first_name)}
            >
              <AntDesign name="close" size={22} color={COLORS.dark.error} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.likeItemAction}
              onPress={() => handleViewProfile(item.id, item.first_name, userPhoto)}
            >
              <Ionicons name="person" size={22} color={COLORS.dark.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.likeItemAction}
              onPress={() => handleStartChat(item.id, item.first_name, userPhoto)}
            >
              <Ionicons name="chatbubble" size={22} color={COLORS.dark.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#1A1A1A', '#121212']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Beğeniler</Text>
          </View>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={COLORS.dark.primary} />
            </View>
          ) : isPremium ? (
            likes.length > 0 ? (
              <FlatList
                data={likes}
                renderItem={renderLikeItem}
                keyExtractor={(item) => item.interaction_id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.likesList}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                refreshing={loading}
                onRefresh={fetchLikes}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="heart-off"
                  size={50}
                  color={COLORS.dark.textSecondary}
                  style={styles.emptyIcon}
                />
                <Text style={styles.emptyText}>Henüz beğeni bulunmuyor</Text>
                <Text style={styles.emptyDescription}>
                  Seni beğenen yeni biri olduğunda burada göreceksin.
                </Text>
              </View>
            )
          ) : (
            <View style={styles.premiumUpsellContainer}>
              <LinearGradient
                colors={['#9C27B0', '#673AB7']}
                style={styles.premiumUpsellGradient}
              >
                <MaterialCommunityIcons
                  name="heart-multiple"
                  size={64}
                  color="#FFFFFF"
                  style={styles.premiumUpsellIcon}
                />
                
                <Text style={styles.premiumUpsellText}>
                  {randomLikeCount} kullanıcı seni beğendi
                </Text>
                
                <Text style={styles.premiumUpsellDescription}>
                  Kimlerin seni beğendiğini görmek için Premium üye ol.
                </Text>
                
                <TouchableOpacity 
                  style={styles.premiumButton}
                  onPress={navigateToPremium}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                    style={styles.premiumButtonGradient}
                  >
                    <MaterialCommunityIcons name="crown" size={20} color="#FFFFFF" />
                    <Text style={styles.premiumButtonText}>Premium Ol</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: '#FFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likesList: {
    paddingVertical: SPACING.md,
  },
  likeItemContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.dark.surface,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.medium,
  },
  likeItemPhotoContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  likeItemPhoto: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
  },
  superLikeBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: COLORS.dark.surface,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.light.warning,
  },
  likeItemInfoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  likeItemHeader: {
    marginBottom: SPACING.xs,
  },
  likeItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: 2,
  },
  likeItemLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeItemLocationText: {
    fontSize: 12,
    color: COLORS.dark.textSecondary,
    marginLeft: 2,
  },
  likeItemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  likeItemAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.dark.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  separator: {
    height: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyIcon: {
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.dark.textSecondary,
    textAlign: 'center',
  },
  premiumUpsellContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  premiumUpsellGradient: {
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.medium,
  },
  premiumUpsellIcon: {
    marginBottom: SPACING.lg,
  },
  premiumUpsellText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  premiumUpsellDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  premiumButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.md,
    width: '100%',
    ...SHADOWS.medium,
  },
  premiumButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  premiumButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: SPACING.sm,
  },
}); 