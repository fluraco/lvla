import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ChatRoom } from '../types/chat';
import { useUser } from '../contexts/UserContext';

export function useChatRooms() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useUser();
  
  // Kullanıcıya ait sohbet odalarını getir
  const fetchRooms = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Kullanıcının katıldığı odaları getir
      const { data: participantRooms, error: participantError } = await supabase
        .from('room_participants')
        .select(`
          room_id,
          room:room_id (
            id,
            name,
            created_at,
            hidden_for_user_ids
          )
        `)
        .eq('user_id', user.id);
      
      if (participantError) throw participantError;
      
      if (participantRooms && participantRooms.length > 0) {
        // Odaları formatla ve kullanıcı için gizlenmiş odaları filtrele
        const formattedRooms = participantRooms
          .filter((item: any) => {
            // hidden_for_user_ids içinde kullanıcı ID'si yoksa göster
            const hiddenForUsers = item.room.hidden_for_user_ids || [];
            return !hiddenForUsers.includes(user.id);
          })
          .map((item: any) => ({
            id: item.room.id,
            name: item.room.name,
            created_at: item.room.created_at,
            hidden_for_user_ids: item.room.hidden_for_user_ids || [],
            participants: [], // İlk başta boş, daha sonra doldurulabilir
            unread_count: 0 // Başlangıçta sıfır, daha sonra hesaplanacak
          }));
        
        // Her oda için son mesajı, katılımcıları ve okunmamış mesaj sayısını getir
        for (const room of formattedRooms) {
          // Son mesajı getir
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at, user_id')
            .eq('room', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (lastMessage) {
            room.last_message = lastMessage.content;
            room.last_message_at = lastMessage.created_at;
            room.last_message_sender_id = lastMessage.user_id;
          }
          
          // Okunmamış mesaj sayısını getir
          const { data: unreadMessages, error: unreadError } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('room', room.id)
            .neq('user_id', user.id) // Kullanıcının kendi mesajları hariç
            .not('read_by', 'cs', `{${user.id}}`) // Kullanıcı tarafından okunmamış olanlar
            .order('created_at', { ascending: false });
          
          if (!unreadError && unreadMessages) {
            room.unread_count = unreadMessages.length;
          }
          
          // Odadaki diğer katılımcıları getir
          const { data: participants } = await supabase
            .from('room_participants')
            .select(`
              user_id,
              users:user_id (
                id,
                first_name,
                last_name,
                profile_photo
              )
            `)
            .eq('room_id', room.id)
            .neq('user_id', user.id);
          
          if (participants && participants.length > 0) {
            // Diğer katılımcının bilgilerini kullan
            const otherUser = participants[0].users;
            if (otherUser) {
              // Oda ismini diğer kullanıcının adı olarak ayarla
              room.name = `${otherUser.first_name} ${otherUser.last_name}`;
              // Diğer kullanıcının profil resmini kaydet
              room.other_user_photo = otherUser.profile_photo;
              // Katılımcı ID'lerini kaydet
              room.participants = participants.map(p => p.user_id);
            }
          }
        }
        
        setRooms(formattedRooms);
      } else {
        setRooms([]);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Sohbet odaları yüklenirken hata oluştu:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  // Bir sohbet odasındaki tüm mesajları okundu olarak işaretle
  const markRoomAsRead = useCallback(async (roomId: string) => {
    if (!user) return;
    
    try {
      // Oda ID ve kullanıcı ID'sine göre okunmamış mesajları al
      const { data: unreadMessages, error: fetchError } = await supabase
        .from('messages')
        .select('id, read_by')
        .eq('room', roomId)
        .neq('user_id', user.id) // Kullanıcının kendi mesajları hariç
        .not('read_by', 'cs', `{${user.id}}`); // Kullanıcı tarafından okunmamış olanlar
      
      if (fetchError) throw fetchError;
      
      if (unreadMessages && unreadMessages.length > 0) {
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
        
        // Odaları yeniden yükle
        await fetchRooms();
      }
    } catch (err) {
      console.error('Mesajlar okundu olarak işaretlenirken hata oluştu:', err);
    }
  }, [user, fetchRooms]);
  
  // Belirli bir mesajı okundu olarak işaretle
  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!user) return;
    
    try {
      // Mesajı al
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('id, read_by')
        .eq('id', messageId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (message) {
        const readByArray = message.read_by || [];
        if (!readByArray.includes(user.id)) {
          // Read_by dizisini güncelle
          await supabase
            .from('messages')
            .update({
              read_by: [...readByArray, user.id]
            })
            .eq('id', messageId);
          
          // Odaları yeniden yükle
          await fetchRooms();
        }
      }
    } catch (err) {
      console.error('Mesaj okundu olarak işaretlenirken hata oluştu:', err);
    }
  }, [user, fetchRooms]);
  
  // Yeni sohbet odası oluştur
  const createRoom = useCallback(async (roomName: string, participants: string[]) => {
    if (!user) return null;
    
    try {
      // Sohbet odasını oluştur
      const { data: newRoom, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: roomName,
          created_by: user.id
        })
        .select()
        .single();
      
      if (roomError) throw roomError;
      
      // Katılımcıları ekle
      const participantsWithCreator = [...new Set([...participants, user.id])];
      
      const participantsData = participantsWithCreator.map(userId => ({
        room_id: newRoom.id,
        user_id: userId,
      }));
      
      const { error: participantsError } = await supabase
        .from('room_participants')
        .insert(participantsData);
      
      if (participantsError) throw participantsError;
      
      // Odaları yeniden yükle
      await fetchRooms();
      
      return newRoom.id;
    } catch (err) {
      console.error('Sohbet odası oluşturulurken hata oluştu:', err);
      setError(err as Error);
      return null;
    }
  }, [user, fetchRooms]);
  
  // Gizlenmiş bir sohbeti kullanıcı için tekrar görünür yap
  const unhideRoom = useCallback(async (roomId: string) => {
    if (!user) return false;
    
    try {
      // Önce mevcut sohbetin verilerini al
      const { data: roomData, error: fetchError } = await supabase
        .from('rooms')
        .select('hidden_for_user_ids')
        .eq('id', roomId)
        .single();
      
      if (fetchError) {
        console.error('Sohbet bilgileri alınırken hata:', fetchError);
        return false;
      }
      
      // Mevcut hidden_for_user_ids dizisini al
      const currentHiddenIds = roomData?.hidden_for_user_ids || [];
      
      // Kullanıcı ID'sini diziden çıkar
      const updatedHiddenIds = currentHiddenIds.filter(id => id !== user.id);
      
      // Güncellenmiş hidden_for_user_ids ile sohbeti güncelle
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ 
          hidden_for_user_ids: updatedHiddenIds
        })
        .eq('id', roomId);
      
      if (updateError) {
        console.error('Sohbet görünür yapılırken hata oluştu:', updateError);
        return false;
      }
      
      // Odaları yeniden yükle
      await fetchRooms();
      
      return true;
    } catch (err) {
      console.error('Sohbet görünür yapılırken hata:', err);
      return false;
    }
  }, [user, fetchRooms]);
  
  // Realtime odalar dinleyicisi
  useEffect(() => {
    if (!user) return;
    
    const setupRealtimeListener = async () => {
      await fetchRooms();
      
      // Yeni odalar için dinleyici
      const roomsSubscription = supabase
        .channel('room-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'room_participants',
          filter: `user_id=eq.${user.id}`
        }, () => {
          // Odaları yeniden yükle
          fetchRooms();
        })
        .subscribe();
      
      // Son mesajlar için dinleyici
      const messagesSubscription = supabase
        .channel('latest-messages')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, (payload) => {
          const newMessage = payload.new as any;
          
          // Eğer mesaj kullanıcının olduğu bir odada ise, odaları güncelle
          setRooms(prevRooms => {
            const roomIndex = prevRooms.findIndex(r => r.id === newMessage.room);
            
            if (roomIndex !== -1) {
              const updatedRooms = [...prevRooms];
              updatedRooms[roomIndex] = {
                ...updatedRooms[roomIndex],
                last_message: newMessage.content,
                last_message_at: newMessage.created_at,
                last_message_sender_id: newMessage.user_id
              };
              
              // Eğer mesaj başka bir kullanıcıdan geldiyse, okunmamış sayısını artır
              if (newMessage.user_id !== user.id) {
                updatedRooms[roomIndex].unread_count = (updatedRooms[roomIndex].unread_count || 0) + 1;
              }
              
              // Mesaj zamanına göre sırala
              return updatedRooms.sort((a, b) => {
                const dateA = a.last_message_at ? new Date(a.last_message_at) : new Date(0);
                const dateB = b.last_message_at ? new Date(b.last_message_at) : new Date(0);
                return dateB.getTime() - dateA.getTime();
              });
            }
            
            return prevRooms;
          });
        })
        .subscribe();
      
      // Temizlik fonksiyonu
      return () => {
        roomsSubscription.unsubscribe();
        messagesSubscription.unsubscribe();
      };
    };
    
    setupRealtimeListener();
  }, [user, fetchRooms]);
  
  return {
    rooms,
    isLoading,
    error,
    refreshRooms: fetchRooms,
    createRoom,
    markRoomAsRead,
    markMessageAsRead,
    unhideRoom
  };
} 