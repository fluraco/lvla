import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScaledText } from '../../../components/common/ScaledText';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../../theme';

export function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Geri butonu
  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : SPACING.md }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.dark.text} />
        </TouchableOpacity>
        <ScaledText style={styles.headerTitle}>Gizlilik Politikası</ScaledText>
        <View style={styles.rightPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introduction}>
          <ScaledText style={styles.introductionText}>
            Lovla olarak, kişisel gizliliğinizin korunmasına büyük önem veriyoruz. Bu Gizlilik Politikası, hizmetlerimizi kullanırken hangi bilgileri topladığımızı, bu bilgileri nasıl kullandığımızı ve koruduğumuzu açıklamaktadır.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>1. Toplanan Bilgiler</ScaledText>
          <ScaledText style={styles.sectionText}>
            <ScaledText style={styles.subTitle}>1.1 Hesap Bilgileri:</ScaledText> Ad, soyad, e-posta adresi, telefon numarası ve doğum tarihi gibi hesap oluşturma sırasında sağladığınız bilgiler.
            {'\n\n'}
            <ScaledText style={styles.subTitle}>1.2 Profil Bilgileri:</ScaledText> Profil fotoğrafları, ilgi alanları, hobiler, konum ve tercihler gibi uygulama içinde paylaştığınız bilgiler.
            {'\n\n'}
            <ScaledText style={styles.subTitle}>1.3 İletişim İçeriği:</ScaledText> Diğer kullanıcılarla yaptığınız yazışmalar ve paylaştığınız içerikler.
            {'\n\n'}
            <ScaledText style={styles.subTitle}>1.4 Kullanım Verileri:</ScaledText> Uygulamayı nasıl kullandığınıza dair bilgiler, oturum süreleri, görüntülenen profiller ve etkileşim bilgileri.
            {'\n\n'}
            <ScaledText style={styles.subTitle}>1.5 Cihaz Bilgileri:</ScaledText> IP adresi, cihaz türü, işletim sistemi ve tarayıcı bilgileri gibi teknik veriler.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>2. Bilgilerin Kullanımı</ScaledText>
          <ScaledText style={styles.sectionText}>
            Topladığımız bilgileri aşağıdaki amaçlarla kullanırız:
            {'\n\n'}
            • Hizmetlerimizi sağlamak, geliştirmek ve özelleştirmek
            {'\n'}
            • Hesabınızı yönetmek ve güvenliğini sağlamak
            {'\n'}
            • Diğer kullanıcılarla eşleşmenizi ve iletişim kurmanızı sağlamak
            {'\n'}
            • Uygulama deneyiminizi iyileştirmek için analiz yapmak
            {'\n'}
            • Uygulama içi bildirimler ve güncellemeler göndermek
            {'\n'}
            • Dolandırıcılık ve kötüye kullanım durumlarını tespit etmek ve önlemek
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>3. Bilgilerin Paylaşımı</ScaledText>
          <ScaledText style={styles.sectionText}>
            Kişisel bilgilerinizi aşağıdaki durumlarda paylaşabiliriz:
            {'\n\n'}
            <ScaledText style={styles.subTitle}>3.1 Diğer Kullanıcılar:</ScaledText> Profil bilgileriniz ve paylaştığınız içerikler, uygulama içindeki diğer kullanıcılar tarafından görülebilir.
            {'\n\n'}
            <ScaledText style={styles.subTitle}>3.2 Hizmet Sağlayıcılar:</ScaledText> Hizmetlerimizi sunmamıza yardımcı olan üçüncü taraf hizmet sağlayıcılar (ör. hosting, analitik, ödeme işlemleri).
            {'\n\n'}
            <ScaledText style={styles.subTitle}>3.3 Yasal Gereklilikler:</ScaledText> Yasal bir yükümlülüğü yerine getirmek, haklarımızı korumak veya yasal bir talebe yanıt vermek için gerekli olduğunda.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>4. Veri Güvenliği</ScaledText>
          <ScaledText style={styles.sectionText}>
            Kişisel bilgilerinizi korumak için çeşitli teknik ve organizasyonel güvenlik önlemleri uyguluyoruz. Ancak, internet üzerinden hiçbir veri iletiminin veya elektronik depolamanın %100 güvenli olmadığını hatırlatmak isteriz.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>5. Veri Saklama</ScaledText>
          <ScaledText style={styles.sectionText}>
            Kişisel bilgilerinizi, hesabınız aktif olduğu sürece ve hizmetlerimizi sağlamak için gerekli olduğu sürece saklarız. Hesabınızı sildiğinizde, bilgilerinizi yasal yükümlülüklerimizi yerine getirmek veya meşru iş çıkarlarımızı korumak için gerekli olmadığı sürece sileriz veya anonimleştiririz.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>6. Haklarınız</ScaledText>
          <ScaledText style={styles.sectionText}>
            Kişisel verilerinizle ilgili aşağıdaki haklara sahipsiniz:
            {'\n\n'}
            • Verilerinize erişim talep etme
            {'\n'}
            • Yanlış verilerin düzeltilmesini talep etme
            {'\n'}
            • Verilerinizin silinmesini talep etme
            {'\n'}
            • Veri işlememize itiraz etme
            {'\n'}
            • Veri taşınabilirliği talep etme
            {'\n\n'}
            Bu haklarınızı kullanmak için lovla.iletisim@gmail.com adresine e-posta gönderebilirsiniz.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>7. Çerezler ve Takip Teknolojileri</ScaledText>
          <ScaledText style={styles.sectionText}>
            Hizmetlerimizi iyileştirmek ve kişiselleştirmek için çerezler ve benzer takip teknolojileri kullanabiliriz. Bu teknolojilerin nasıl kullanıldığı hakkında daha fazla bilgi için Çerez Politikamıza bakabilirsiniz.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>8. Çocukların Gizliliği</ScaledText>
          <ScaledText style={styles.sectionText}>
            Hizmetlerimiz 18 yaşın altındaki kişilere yönelik değildir. 18 yaşın altındaki kişilerden bilerek kişisel bilgi toplamıyoruz. Eğer 18 yaşın altında olduğunuzu düşündüğümüz bir kullanıcıdan kişisel bilgi topladığımızı fark edersek, bu bilgileri derhal silme hakkımızı saklı tutarız.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>9. Değişiklikler</ScaledText>
          <ScaledText style={styles.sectionText}>
            Bu Gizlilik Politikası'nı zaman zaman güncelleyebiliriz. Güncellemeler uygulama içinde bildirilecek ve güncellenen politikanın yürürlüğe girmesinden sonra hizmetlerimizi kullanmaya devam etmeniz, güncellenmiş politikayı kabul ettiğiniz anlamına gelecektir.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>10. İletişim</ScaledText>
          <ScaledText style={styles.sectionText}>
            Bu Gizlilik Politikası ile ilgili sorularınız veya endişeleriniz varsa, lütfen lovla.iletisim@gmail.com adresine e-posta gönderin.
          </ScaledText>
        </View>

        <View style={styles.lastUpdated}>
          <ScaledText style={styles.lastUpdatedText}>
            Son Güncelleme: 1 Kasım 2023
          </ScaledText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
  },
  backButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: 'bold',
    color: COLORS.dark.text,
  },
  rightPlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  introduction: {
    marginBottom: SPACING.xl,
  },
  introductionText: {
    fontSize: TYPOGRAPHY.body2.fontSize,
    lineHeight: 22,
    color: COLORS.dark.text,
    textAlign: 'center',
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.subtitle1.fontSize,
    fontWeight: 'bold',
    color: COLORS.dark.text,
    marginBottom: SPACING.sm,
  },
  sectionText: {
    fontSize: TYPOGRAPHY.body2.fontSize,
    lineHeight: 22,
    color: COLORS.dark.textSecondary,
  },
  subTitle: {
    fontWeight: 'bold',
    color: COLORS.dark.text,
  },
  lastUpdated: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.dark.textSecondary,
    fontStyle: 'italic',
  },
}); 