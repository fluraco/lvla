import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types/chat';
import { useUser } from '../contexts/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UseRealtimeChatProps {
  roomId: string;
  initialMessages?: ChatMessage[];
}

export function useRealtimeChat({ roomId, initialMessages = [] }: UseRealtimeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useUser();
  
  // Mesajları yükle
  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!user) {
        setMessages([]);
        return;
      }
      
      // Önce bu sohbete ait oda bilgisini kontrol et
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('hidden_for_user_ids')
        .eq('id', roomId)
        .single();
        
      // Oda bilgisini kontrol et - eğer bu oda kullanıcı için gizliyse hiç mesajları getirme
      if (!roomError && roomData && roomData.hidden_for_user_ids && roomData.hidden_for_user_ids.includes(user.id)) {
        // Bu oda kullanıcı için gizli, boş mesaj listesi döndür
        setMessages([]);
        setIsLoading(false);
        return;
      }
      
      // Kullanıcı için bu sohbetin silinme tarihini kontrol et
      const deletedAtKey = `chat_deleted_at_${roomId}_${user.id}`;
      const deletedAtStr = await AsyncStorage.getItem(deletedAtKey);
      
      // Şimdi mesajları getir
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          room,
          read_by,
          user:users!user_id (id, first_name, last_name, profile_photo, phone_number)
        `)
        .eq('room', roomId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Eğer silme tarihi varsa, o tarihten sonraki mesajları filtrele
      let filteredMessages = data as ChatMessage[];
      
      if (deletedAtStr) {
        console.log(`Sohbet silme tarihi bulundu: ${deletedAtKey} = ${deletedAtStr}`);
        const deletedAt = new Date(deletedAtStr);
        
        filteredMessages = filteredMessages.filter(msg => {
          const messageDate = new Date(msg.created_at);
          return messageDate > deletedAt; // Sadece silme tarihinden sonraki mesajları göster
        });
        
        console.log(`Toplam ${data.length} mesajdan ${filteredMessages.length} mesaj gösteriliyor (silme tarihi: ${deletedAtStr})`);
      }
      
      setMessages(filteredMessages);
      
      // Kullanıcının kendisinin göndermediklerini okundu olarak işaretle
      if (user) {
        markMessagesAsRead(filteredMessages);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Mesajlar yüklenirken hata oluştu:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, user, markMessagesAsRead]);
  
  // Mesajları okundu olarak işaretle
  const markMessagesAsRead = useCallback(async (messagesToMark: ChatMessage[]) => {
    if (!user) return;
    
    try {
      // Kullanıcının kendi mesajları hariç, okunmamış mesajları filtrele
      const unreadMessages = messagesToMark.filter(msg => 
        msg.user_id !== user.id && // Kendi mesajı değil
        (!msg.read_by || !msg.read_by.includes(user.id)) // Henüz okunmamış
      );
      
      if (unreadMessages.length === 0) return;
      
      // Her bir okunmamış mesaj için read_by dizisini güncelle
      for (const message of unreadMessages) {
        const readByArray = message.read_by || [];
        if (!readByArray.includes(user.id)) {
          await supabase
            .from('messages')
            .update({
              read_by: [...readByArray, user.id]
            })
            .eq('id', message.id);
        }
      }
    } catch (err) {
      console.error('Mesajlar okundu olarak işaretlenirken hata oluştu:', err);
    }
  }, [user]);
  
  // Tekil mesajı okundu olarak işaretle
  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user) return;
    
    try {
      // Mesajı al
      const { data, error } = await supabase
        .from('messages')
        .select('id, read_by, user_id')
        .eq('id', messageId)
        .single();
      
      if (error) throw error;
      
      // Kendi mesajı değilse ve henüz okunmamışsa işaretle
      if (data && data.user_id !== user.id) {
        const readByArray = data.read_by || [];
        if (!readByArray.includes(user.id)) {
          await supabase
            .from('messages')
            .update({
              read_by: [...readByArray, user.id]
            })
            .eq('id', messageId);
        }
      }
    } catch (err) {
      console.error('Mesaj okundu olarak işaretlenirken hata oluştu:', err);
    }
  }, [user]);
  
  // Mesaj gönder - başarılı olursa true döndürür
  const sendMessage = useCallback(async (content: string, options: { type?: string, metadata?: any } = {}) => {
    if (!user) return false;
    
    try {
      // Önce odayı görünür yap (kullanıcı için gizlenmişse)
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('hidden_for_user_ids')
        .eq('id', roomId)
        .single();
      
      if (!roomError && roomData) {
        const hiddenForUserIds = roomData.hidden_for_user_ids || [];
        
        // Eğer oda bu kullanıcı için gizliyse
        if (hiddenForUserIds.includes(user.id)) {
          // Kullanıcıyı gizli listesinden çıkar
          const updatedHiddenIds = hiddenForUserIds.filter(id => id !== user.id);
          
          await supabase
            .from('rooms')
            .update({ hidden_for_user_ids: updatedHiddenIds })
            .eq('id', roomId);
        }
      }
      
      // Tipi ve metadata'yı belirleyelim
      const type = options.type || 'text';
      const metadata = options.metadata || null;
      
      // Yeni mesajı oluştur
      const newMessage = {
        room: roomId,
        content,
        type: type,
        user_id: user.id,
        read_by: [user.id], // Gönderen otomatik olarak kendi mesajını okumuş sayılır
        metadata: metadata
      };
      
      // Mesajı veritabanına ekle - yerel mesaj ekleme işlemini yapma, realtime ile eklenecek
      const { error } = await supabase
        .from('messages')
        .insert(newMessage);
      
      if (error) throw error;
      
      return true; // Başarılı gönderim
      
    } catch (err) {
      console.error('Mesaj gönderilirken hata oluştu:', err);
      setError(err as Error);
      return false; // Başarısız gönderim
    }
  }, [roomId, user]);
  
  // Realtime mesaj dinleyicisi
  useEffect(() => {
    const setupRealtimeListener = async () => {
      await fetchMessages();
      
      // Realtime dinleyici ekle
      const subscription = supabase
        .channel(`room-${roomId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `room=eq.${roomId}`
        }, (payload) => {
          // Yeni mesaj geldiğinde
          const newMessage = payload.new as ChatMessage;
          
          // Eğer mesaj listesinde zaten varsa ekleme
          setMessages((prevMessages) => {
            // Aynı ID'ye sahip mesaj varsa, mevcut listeyi değiştirmeden döndür
            if (prevMessages.some(msg => msg.id === newMessage.id)) {
              return prevMessages;
            }
            
            // Kullanıcı bilgilerini getir ve mesaja ekle
            supabase
              .from('users')
              .select('id, first_name, last_name, profile_photo')
              .eq('id', newMessage.user_id)
              .single()
              .then(({ data }) => {
                if (data) {
                  const messageWithUser = {
                    ...newMessage,
                    user: {
                      id: data.id,
                      name: `${data.first_name} ${data.last_name}`,
                      first_name: data.first_name,
                      last_name: data.last_name,
                      avatar_url: data.profile_photo,
                      profile_photo: data.profile_photo
                    }
                  };
                  
                  // Mesaj ID kontrolü tekrar yap ve sonra mesajı ekle
                  setMessages(prev => {
                    if (prev.some(msg => msg.id === messageWithUser.id)) {
                      return prev; // Zaten varsa ekleme
                    }
                    return [...prev, messageWithUser];
                  });
                  
                  // Eğer mesaj başka bir kullanıcıdan geldiyse okundu olarak işaretle
                  if (user && newMessage.user_id !== user.id) {
                    markMessageAsRead(newMessage.id);
                  }
                }
              });
            
            // İlk returni olduğu gibi döndürüyoruz, çünkü user yüklendikten sonra
            // yukarıdaki then bloğunda mesajı ekleyeceğiz
            return prevMessages;
          });
        })
        .subscribe();
      
      // Temizlik fonksiyonu
      return () => {
        subscription.unsubscribe();
      };
    };
    
    setupRealtimeListener();
  }, [roomId, fetchMessages, markMessageAsRead, user]);
  
  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refreshMessages: fetchMessages,
    markMessageAsRead
  };
} 