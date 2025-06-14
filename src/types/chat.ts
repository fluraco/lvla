export interface ChatMessage {
  id: string;
  room: string;
  content: string;
  created_at: string;
  user_id: string;
  type?: string; // Mesaj tipi: 'text', 'audio', 'image', 'gift' vs.
  metadata?: {
    duration?: string; // Ses mesajları için süre
    size?: number; // Dosya boyutu
    original_uri?: string; // Orijinal dosya URI'si
    gift_name?: string; // Hediye adı
    gift_value?: number; // Hediye değeri
    [key: string]: any; // Diğer olası metadata alanları
  };
  user: {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    profile_photo?: string;
  };
  read_by?: string[]; // Mesajı okuyan kullanıcı ID'leri
}

export interface ChatRoom {
  id: string;
  name: string;
  last_message?: string;
  last_message_at?: string;
  last_message_sender_id?: string; // Son mesajı gönderen kullanıcının ID'si
  created_at: string;
  participants: string[]; // Kullanıcı ID'leri dizisi
  other_user_photo?: string; // Diğer kullanıcının profil fotoğrafı
  hidden_for_user_ids?: string[]; // Bu odanın gizlendiği kullanıcı ID'leri
  unread_count?: number; // Okunmamış mesaj sayısı
}

export interface ChatParticipant {
  user_id: string;
  room_id: string;
  joined_at: string;
  user: {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    profile_photo?: string;
  };
} 