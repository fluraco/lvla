export const IMAGES = {
  GOOGLE_ICON: require('./icons/google-icon.png'),
  APPLE_ICON: require('./icons/google-icon.png'), // Geçici olarak Google ikonunu kullanıyoruz, daha sonra Apple ikonu eklenebilir
  // Diğer sosyal medya ikonları buraya eklenebilir
} as const;

// Geriye dönük uyumluluk için eski export'u da tutuyoruz
export const images = IMAGES; 