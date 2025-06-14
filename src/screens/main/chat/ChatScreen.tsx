import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Text } from 'react-native-elements';
import { COLORS, SPACING, BORDER_RADIUS } from '../../../theme';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useChatRooms } from '../../../hooks/useChatRooms';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useUser } from '../../../contexts/UserContext';
import { ChatRoom } from '../../../types/chat';
import { supabase } from '../../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ana navigasyon için tip tanımı
type RootStackParamList = {
  Chat: undefined;
  ChatDetail: {
    conversationId: string;
    userName: string;
    userAvatar: string;
  };
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

// Mesaj zaman formatını düzenleyecek yardımcı fonksiyon
const formatMessageTime = (timestamp: string | undefined): string => {
  if (!timestamp) return '';
  
  try {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: tr
    });
  } catch (error) {
    return '';
  }
};

// Sohbet öğesi bileşeni - güncellendi
const ConversationItem = ({ 
  item, 
  onPress, 
  onLongPress 
}: { 
  item: ChatRoom; 
  onPress: (room: ChatRoom) => void; 
  onLongPress: (room: ChatRoom) => void;
}) => {
  const { user } = useUser();
  const hasUnreadMessages = (item.unread_count || 0) > 0;
  
  // Son mesaj içeriğini formatlama
  const formatLastMessage = () => {
    if (!item.last_message) return <Text style={styles.lastMessage}>Henüz mesaj yok</Text>;
    
    // Resim kontrolü
    if (item.last_message.startsWith('image:')) {
      return (
        <View style={styles.imageMessagePreview}>
          <MaterialCommunityIcons name="camera" size={16} color="#64B5F6" style={styles.messageIcon} />
          <Text style={[styles.lastMessage, hasUnreadMessages && styles.unreadMessage]}>Fotoğraf</Text>
        </View>
      );
    }
    
    // Ses mesajı kontrolü
    if (item.last_message.startsWith('audio:')) {
      return (
        <View style={styles.imageMessagePreview}>
          <MaterialCommunityIcons name="microphone" size={16} color="#64B5F6" style={styles.messageIcon} />
          <Text style={[styles.lastMessage, hasUnreadMessages && styles.unreadMessage]}>Sesli Mesaj</Text>
        </View>
      );
    }
    
    // Mesajı gönderen kullanıcı prefix'i
    const senderIsCurrentUser = user && item.last_message_sender_id === user.id;
    const messagePrefix = senderIsCurrentUser ? 'Siz: ' : `${item.name.split(' ')[0]}: `;
    
    return (
      <Text 
        style={[styles.lastMessage, hasUnreadMessages && styles.unreadMessage]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        <Text style={[
          styles.messageSender, 
          senderIsCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
          hasUnreadMessages && styles.unreadMessageSender
        ]}>
          {messagePrefix}
        </Text>
        {item.last_message}
      </Text>
    );
  };
  
  return (
    <TouchableOpacity 
      style={styles.conversationItem} 
      onPress={() => onPress(item)}
      onLongPress={() => onLongPress(item)}
      activeOpacity={0.7}
      delayLongPress={500}
    >
      <Image 
        source={{ 
          uri: item.other_user_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random` 
        }} 
        style={styles.avatar} 
      />
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[
            styles.userName, 
            hasUnreadMessages && styles.unreadUserName
          ]} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={[
            styles.timeText,
            hasUnreadMessages && styles.unreadTimeText
          ]}>
            {formatMessageTime(item.last_message_at)}
          </Text>
        </View>
        
        <View style={styles.messageRow}>
          {formatLastMessage()}
          {hasUnreadMessages && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Yeni sohbet oluşturma modalı bileşeni
const CreateRoomModal = ({ 
  visible, 
  onClose, 
  onCreate 
}: { 
  visible: boolean; 
  onClose: () => void; 
  onCreate: (name: string) => void;
}) => {
  const [roomName, setRoomName] = useState('');
  
  return visible ? (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Yeni Sohbet Odası</Text>
        <TextInput
          style={styles.modalInput}
          placeholder="Oda adı"
          placeholderTextColor="#999"
          value={roomName}
          onChangeText={setRoomName}
        />
        <View style={styles.modalButtons}>
          <TouchableOpacity 
            style={[styles.modalButton, styles.cancelButton]} 
            onPress={onClose}
          >
            <Text style={styles.buttonText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalButton, styles.createButton]}
            onPress={() => {
              if (roomName.trim()) {
                onCreate(roomName);
                setRoomName('');
              }
            }}
            disabled={!roomName.trim()}
          >
            <Text style={styles.buttonText}>Oluştur</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ) : null;
};

// Sohbet Silme Onay Modalı
const DeleteChatModal = ({
  visible,
  onClose,
  onConfirm,
  roomName,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roomName: string;
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Sohbeti Sil</Text>
        <Text style={styles.modalText}>
          "{roomName}" sohbetini silmek istediğinize emin misiniz? Bu işlem sizin tarafınızdan kalıcı olarak silecektir.
        </Text>
        <Text style={styles.modalNote}>
          Not: Diğer kullanıcılar sohbeti görmeye devam edecekler.
        </Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity 
            style={[styles.modalButton, styles.cancelButton]} 
            onPress={onClose}
          >
            <Text style={styles.buttonText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalButton, styles.deleteButton]}
            onPress={onConfirm}
          >
            <Text style={styles.buttonText}>Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useUser();
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' veya 'unread'
  const [createModalVisible, setCreateModalVisible] = useState(false);
  
  // Silme modalı için state'ler
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Supabase chat rooms hook'unu kullan
  const { 
    rooms, 
    isLoading, 
    error, 
    refreshRooms, 
    createRoom,
    markRoomAsRead
  } = useChatRooms();
  
  // Filtrelenmiş ve sıralanmış sohbetler
  const filteredRooms = rooms
    .filter(room => {
      // Arama filtresi
      if (searchText && !room.name.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      
      // Tab filtresi
      if (activeTab === 'unread') {
        // Okunmamış mesajları olan sohbetleri göster
        return (room.unread_count || 0) > 0;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Son mesaj tarihi olan odaları üste taşı (yeniden eskiye sırala)
      const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      
      // Eğer her iki odanın da mesaj tarihi yoksa, oda oluşturma tarihine göre sırala
      if (dateA === 0 && dateB === 0) {
        const createdAtA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const createdAtB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return createdAtB - createdAtA; // Yeniden eskiye
      }
      
      // Son mesaj tarihi olan varsa, onları üste taşı
      if (dateA === 0) return 1; // A'nın mesajı yoksa altta göster
      if (dateB === 0) return -1; // B'nin mesajı yoksa altta göster
      
      // Her ikisinin de mesaj tarihi varsa, yeniden eskiye sırala
      return dateB - dateA;
    });

  const handleConversationPress = (room: ChatRoom) => {
    // Sohbet detayına git
    navigation.navigate('ChatDetail', {
      conversationId: room.id,
      userName: room.name,
      userAvatar: room.other_user_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.name)}&background=random`
    });
    
    // Sohbeti okundu olarak işaretle
    if (room.unread_count && room.unread_count > 0) {
      markRoomAsRead(room.id);
    }
  };
  
  // Sohbete uzun basma işlemi
  const handleConversationLongPress = (room: ChatRoom) => {
    setSelectedRoom(room);
    setDeleteModalVisible(true);
  };
  
  // Sohbet silme işlemi
  const handleDeleteChat = async () => {
    if (!selectedRoom || !user) return;
    
    try {
      setIsDeleting(true);
      
      // Önce mevcut sohbetin verilerini al
      const { data: roomData, error: fetchError } = await supabase
        .from('rooms')
        .select('hidden_for_user_ids')
        .eq('id', selectedRoom.id)
        .single();
      
      if (fetchError) {
        console.error('Sohbet bilgileri alınırken hata:', fetchError);
        Alert.alert('Hata', 'Sohbet bilgileri alınamadı. Lütfen tekrar deneyin.');
        return;
      }
      
      // Mevcut hidden_for_user_ids dizisini al veya boş bir dizi oluştur
      const currentHiddenIds = roomData?.hidden_for_user_ids || [];
      
      // Kullanıcı ID'si zaten dizide yoksa ekle
      if (!currentHiddenIds.includes(user.id)) {
        currentHiddenIds.push(user.id);
      }
      
      // Güncellenmiş hidden_for_user_ids ile sohbeti güncelle
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ 
          hidden_for_user_ids: currentHiddenIds
        })
        .eq('id', selectedRoom.id);
      
      if (updateError) {
        console.error('Sohbet silinirken hata oluştu:', updateError);
        Alert.alert('Hata', 'Sohbet silinirken bir sorun oluştu. Lütfen tekrar deneyin.');
        return;
      }
      
      // Silme tarihini kaydet - bu, bu tarihten önceki mesajların filtrelenmesini sağlayacak
      const deletedAtKey = `chat_deleted_at_${selectedRoom.id}_${user.id}`;
      const currentTime = new Date().toISOString();
      await AsyncStorage.setItem(deletedAtKey, currentTime);
      
      console.log(`Sohbet silme tarihi kaydedildi: ${deletedAtKey} = ${currentTime}`);
      
      // Sohbet listesini güncelle
      await refreshRooms();
      
      // Başarı mesajı göster
      Alert.alert('Başarılı', 'Sohbet başarıyla silindi.');
    } catch (err) {
      console.error('Sohbet silme hatası:', err);
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsDeleting(false);
      setDeleteModalVisible(false);
      setSelectedRoom(null);
    }
  };

  const handleCreateRoom = async (name: string) => {
    if (user) {
      await createRoom(name, []);
      setCreateModalVisible(false);
    }
  };
  
  // Component yüklendiğinde ve user değiştiğinde odaları yenile
  useEffect(() => {
    if (user) {
      refreshRooms();
    }
  }, [user, refreshRooms]);

  return (
    <LinearGradient
      colors={['#1A1A1A', '#121212']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>Sohbetler</Text>
          </View>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#999" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Ara"
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              Tümü
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'unread' && styles.activeTab]}
            onPress={() => setActiveTab('unread')}
          >
            <Text style={[styles.tabText, activeTab === 'unread' && styles.activeTabText]}>
              Okunmamış
            </Text>
            {rooms.filter(room => (room.unread_count || 0) > 0).length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {rooms.filter(room => (room.unread_count || 0) > 0).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#128C7E" />
            <Text style={styles.loadingText}>Sohbetler yükleniyor...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={40} color="#FF6B7D" />
            <Text style={styles.errorText}>
              Sohbetler yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => refreshRooms()}
            >
              <Text style={styles.retryText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredRooms}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => 
              <ConversationItem 
                item={item} 
                onPress={handleConversationPress}
                onLongPress={handleConversationLongPress}
              />
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchText.length > 0 
                    ? 'Arama sonucu bulunamadı' 
                    : activeTab === 'unread'
                      ? 'Okunmamış mesaj bulunmuyor'
                      : 'Henüz sohbet bulunmuyor'
                  }
                </Text>
              </View>
            }
            refreshing={isLoading}
            onRefresh={refreshRooms}
          />
        )}
      </SafeAreaView>
      
      <CreateRoomModal 
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreateRoom}
      />
      
      <DeleteChatModal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false);
          setSelectedRoom(null);
        }}
        onConfirm={handleDeleteChat}
        roomName={selectedRoom?.name || ''}
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    marginLeft: 8,
    padding: 0,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.md,
  },
  activeTab: {
    backgroundColor: '#333',
  },
  tabText: {
    fontSize: 15,
    color: '#AAA',
  },
  activeTabText: {
    fontWeight: '600',
    color: '#FFF',
  },
  tabBadge: {
    backgroundColor: '#128C7E',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FFF',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#128C7E',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
  },
  retryText: {
    color: '#FFF',
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 0,
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: BORDER_RADIUS.circular,
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  unreadUserName: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timeText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 8,
  },
  unreadTimeText: {
    color: '#128C7E',
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#CCC',
  },
  separator: {
    height: 1,
    backgroundColor: '#333',
    marginLeft: 78,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#222',
    padding: 20,
    borderRadius: BORDER_RADIUS.lg,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#333',
    borderRadius: BORDER_RADIUS.md,
    padding: 10,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#444',
    marginRight: 10,
  },
  createButton: {
    backgroundColor: '#128C7E',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalText: {
    color: '#CCC',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalNote: {
    color: '#999',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  deleteButton: {
    backgroundColor: '#FF6B7D',
  },
  imageMessagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageIcon: {
    marginRight: 8,
  },
  messageSender: {
    fontWeight: '600',
  },
  currentUserMessage: {
    color: '#64B5F6', // Mavi ton - "Siz:" için
  },
  otherUserMessage: {
    color: '#FFD54F', // Altın/Sarı ton - diğer kullanıcılar için
  },
  unreadMessageSender: {
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#128C7E',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 