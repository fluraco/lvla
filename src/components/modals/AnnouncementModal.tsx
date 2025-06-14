import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Linking, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Announcement } from '../../services/announcement';
import { useAnnouncements } from '../../contexts/AnnouncementContext';

// Ekran boyutlarını al
const { width } = Dimensions.get('window');

interface AnnouncementModalProps {
  visible: boolean;
  onClose: () => void;
  announcement: Announcement | null;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  visible,
  onClose,
  announcement
}) => {
  const { markAsViewed } = useAnnouncements();

  // Duyuru görüntülendiğinde kaydet
  useEffect(() => {
    if (visible && announcement) {
      markAsViewed(announcement.id);
    }
  }, [visible, announcement]);

  // Duyuru yok ise gösterme
  if (!announcement) return null;

  // Link varsa aç
  const handleLinkPress = async () => {
    if (announcement.link_url) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const supported = await Linking.canOpenURL(announcement.link_url);
        if (supported) {
          await Linking.openURL(announcement.link_url);
        } else {
          console.error(`URL desteklenmiyor: ${announcement.link_url}`);
        }
      } catch (error) {
        console.error('Link açılırken hata:', error);
      }
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Başlık */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="bullhorn" size={24} color="#FF6B7D" />
            <Text style={styles.title}>{announcement.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {/* İçerik */}
          <ScrollView style={styles.content}>
            {announcement.image_url && (
              <Image 
                source={{ uri: announcement.image_url }} 
                style={styles.image}
                resizeMode="cover"
              />
            )}
            <Text style={styles.contentText}>{announcement.content}</Text>
          </ScrollView>

          {/* Butonlar */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>Tamam</Text>
            </TouchableOpacity>
            
            {announcement.link_url && (
              <TouchableOpacity onPress={handleLinkPress} style={styles.linkButton}>
                <Text style={styles.linkButtonText}>Detaylar</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 500,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#222',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginLeft: 10,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
    maxHeight: 400,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  contentText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B7D',
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
}); 